import "server-only";

import path from "path";
import fs from "fs";
import { createRequire } from "module";
import PDFDocument from "pdfkit";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { getPurchaseOrderById } from "@/lib/services/purchaseOrder.service";
import {
  formatCurrencyForPdf,
  formatDateTimeInTimezone,
  sanitizePdfText,
} from "@/lib/utils";
import { signatureDataUrlToBuffer } from "@/lib/utils/signatureDataUrl";

type PoPdfRow = {
  poNumber: string;
  title?: string;
  status: string;
  subtotal: number;
  total: number;
  notes?: string;
  expectedDeliveryDate?: Date | string | null;
  createdAt: Date | string;
  approvedAt?: Date | string | null;
  organizationId?: {
    name?: string;
    type?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
  } | null;
  createdBy?: { name?: string } | null;
  approvedBy?: { name?: string } | null;
  submittedSignature?: {
    name: string;
    signedAt: Date | string;
    imageDataUrl: string;
  } | null;
  approvedSignature?: {
    name: string;
    signedAt: Date | string;
    imageDataUrl: string;
  } | null;
  items: {
    productName: string;
    sku: string;
    quantity: number;
    receivedQuantity?: number;
    unitCost: number;
    total: number;
  }[];
};

const nodeRequire = createRequire(import.meta.url);

function ensurePdfKitFonts(): void {
  if (process.env.PDFKIT_FONT_PATH) return;

  const candidates: string[] = [];
  try {
    const pdfkitEntry = nodeRequire.resolve("pdfkit");
    const pdfkitDir = path.dirname(pdfkitEntry);
    // Entry is often `.../pdfkit/js/pdfkit.js` — fonts live in `.../pdfkit/js/data`.
    candidates.push(path.join(pdfkitDir, "data"));
    candidates.push(path.join(pdfkitDir, "js", "data"));
    candidates.push(path.join(pdfkitDir, "..", "js", "data"));
  } catch {
    // pdfkit resolved via bundler path below
  }

  candidates.push(path.join(process.cwd(), "node_modules", "pdfkit", "js", "data"));

  for (const dataPath of candidates) {
    if (fs.existsSync(dataPath)) {
      process.env.PDFKIT_FONT_PATH = dataPath;
      return;
    }
  }

  throw new Error(
    "PDF fonts are not available. Ensure pdfkit is installed and serverExternalPackages includes \"pdfkit\"."
  );
}

function createPdfDocument(): {
  doc: InstanceType<typeof PDFDocument>;
  toBuffer: () => Promise<Buffer>;
} {
  ensurePdfKitFonts();
  const doc = new PDFDocument({ size: "A4", margin: 48, autoFirstPage: true });
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  return {
    doc,
    toBuffer: () => {
      doc.end();
      return done;
    },
  };
}

function drawSignatureBlock(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  signature: { name: string; signedAt: Date | string; imageDataUrl: string },
  x: number,
  y: number,
  width: number,
  timezone: string
) {
  doc.fontSize(9).fillColor("#444444").text(label, x, y, { width });
  const imageY = y + 14;
  try {
    const img = signatureDataUrlToBuffer(signature.imageDataUrl);
    doc.image(img, x, imageY, { fit: [width, 48] });
  } catch {
    doc.fontSize(8).fillColor("#999999").text("(signature unavailable)", x, imageY);
  }
  const metaY = imageY + 52;
  doc
    .fontSize(8)
    .fillColor("#333333")
    .text(sanitizePdfText(signature.name), x, metaY, { width })
    .text(formatDateTimeInTimezone(signature.signedAt, timezone), x, metaY + 11, { width });
}

export async function buildPurchaseOrderPdf(poId: string): Promise<Buffer> {
  const poRaw = await getPurchaseOrderById(poId);
  if (!poRaw) throw new Error("Purchase order not found");

  const settings = await getPublicAppSettings();
  const po = poRaw as unknown as PoPdfRow;
  const items = Array.isArray(po.items) ? po.items : [];
  const money = (n: number) => formatCurrencyForPdf(n, settings.currency);
  const when = (d: Date | string | null | undefined) =>
    d ? sanitizePdfText(formatDateTimeInTimezone(d, settings.timezone)) : "-";
  const txt = (value: string) => sanitizePdfText(value);

  const { doc, toBuffer } = createPdfDocument();
  const marginLeft = doc.page.margins.left;
  const pageWidth = doc.page.width - marginLeft - doc.page.margins.right;

  doc.fontSize(18).fillColor("#1e3157").text(txt(settings.appName));
  doc.moveDown(0.25);
  doc.fontSize(14).fillColor("#333333").text("Purchase Order");
  doc.fontSize(11).fillColor("#666666").text(txt(po.poNumber));
  if (po.title?.trim()) {
    doc.fontSize(12).fillColor("#333333").text(txt(po.title.trim()));
  }
  doc.moveDown(0.5);

  doc
    .fontSize(9)
    .fillColor("#444444")
    .text(txt(`Status: ${po.status.toUpperCase()} | Created: ${when(po.createdAt)}`));

  if (po.expectedDeliveryDate) {
    doc.text(`Expected delivery: ${when(po.expectedDeliveryDate)}`);
  }

  doc.moveDown(0.75);

  const org = po.organizationId;
  if (org?.name) {
    doc.fontSize(10).fillColor("#1e3157").text("Organization", { underline: true });
    doc.fontSize(9).fillColor("#333333");
    doc.text(txt(org.name));
    if (org.type) doc.text(txt(org.type));
    if (org.contactPerson) doc.text(txt(`Contact: ${org.contactPerson}`));
    if (org.email) doc.text(txt(org.email));
    if (org.phone) doc.text(txt(org.phone));
    doc.moveDown(0.5);
  }

  if (po.createdBy?.name) {
    doc.fontSize(9).fillColor("#666666").text(txt(`Prepared by: ${po.createdBy.name}`));
    doc.moveDown(0.5);
  }

  const tableTop = doc.y + 8;
  const colProduct = marginLeft;
  const colSku = marginLeft + 200;
  const colQty = marginLeft + pageWidth - 155;
  const colUnit = marginLeft + pageWidth - 110;
  const colTotal = marginLeft + pageWidth - 55;

  doc.save();
  doc.rect(marginLeft, tableTop, pageWidth, 18).fill("#3c2e60");
  doc.restore();
  doc.fontSize(8).fillColor("#ffffff");
  doc.text("Product", colProduct, tableTop + 5, { width: 190 });
  doc.text("SKU", colSku, tableTop + 5, { width: 85 });
  doc.text("Qty", colQty, tableTop + 5, { width: 40, align: "right" });
  doc.text("Unit", colUnit, tableTop + 5, { width: 55, align: "right" });
  doc.text("Total", colTotal, tableTop + 5, { width: 55, align: "right" });

  let rowY = tableTop + 22;
  doc.fillColor("#333333").fontSize(8);

  for (const item of items) {
    if (rowY > doc.page.height - doc.page.margins.bottom - 120) {
      doc.addPage();
      rowY = doc.page.margins.top;
    }
    doc.text(txt(item.productName ?? ""), colProduct, rowY, { width: 190 });
    doc.text(txt(item.sku ?? ""), colSku, rowY, { width: 85 });
    doc.text(String(item.quantity ?? 0), colQty, rowY, { width: 40, align: "right" });
    doc.text(money(item.unitCost ?? 0), colUnit, rowY, { width: 55, align: "right" });
    doc.text(money(item.total ?? 0), colTotal, rowY, { width: 55, align: "right" });
    rowY += 18;
  }

  rowY += 6;
  doc
    .moveTo(marginLeft, rowY)
    .lineTo(marginLeft + pageWidth, rowY)
    .strokeColor("#dddddd")
    .stroke();
  rowY += 10;
  doc.fontSize(10).fillColor("#1e3157");
  doc.text("Total", colUnit, rowY, { width: 55, align: "right" });
  doc.text(money(po.total), colTotal, rowY, { width: 55, align: "right" });

  rowY += 28;

  if (po.notes?.trim()) {
    doc.fontSize(9).fillColor("#444444").text("Notes", marginLeft, rowY);
    doc.fontSize(9).fillColor("#333333").text(txt(po.notes.trim()), marginLeft, rowY + 12, {
      width: pageWidth,
    });
    rowY = doc.y + 16;
  }

  const hasSubmitted = !!po.submittedSignature;
  const hasApproved = !!po.approvedSignature;

  if (hasSubmitted || hasApproved) {
    if (rowY > doc.page.height - doc.page.margins.bottom - 120) {
      doc.addPage();
      rowY = doc.page.margins.top;
    }
    doc.fontSize(10).fillColor("#1e3157").text("Digital signatures", marginLeft, rowY);
    rowY += 18;
    const blockWidth = (pageWidth - 16) / 2;
    if (hasSubmitted && po.submittedSignature) {
      drawSignatureBlock(
        doc,
        "Submitted by",
        po.submittedSignature,
        marginLeft,
        rowY,
        blockWidth,
        settings.timezone
      );
    }
    if (hasApproved && po.approvedSignature) {
      drawSignatureBlock(
        doc,
        "Approved by",
        po.approvedSignature,
        marginLeft + blockWidth + 16,
        rowY,
        blockWidth,
        settings.timezone
      );
    }
  }

  const footerY = doc.page.height - doc.page.margins.bottom - 20;
  doc
    .fontSize(7)
    .fillColor("#999999")
    .text(
      txt(
        `Generated ${formatDateTimeInTimezone(new Date(), settings.timezone)} - ${settings.appName}`
      ),
      marginLeft,
      footerY,
      { align: "center", width: pageWidth }
    );

  return toBuffer();
}

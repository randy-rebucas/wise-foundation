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
import {
  computePaymentTermsSchedule,
  formatPurchaseOrderPaymentTerms,
} from "@/lib/utils/purchaseOrderTotals";

type PoPdfRow = {
  poNumber: string;
  title?: string;
  status: string;
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  total: number;
  paymentTermsMonths?: 3 | 6 | null;
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

const TABLE_BORDER = "#b8b8b8";
const TABLE_HEADER_BORDER = "#2a2240";
const TABLE_HEADER_FILL = "#3c2e60";
const CELL_PAD = 4;
const HEADER_ROW_HEIGHT = 20;
const MIN_DATA_ROW_HEIGHT = 18;

type PdfTableColumn = {
  label: string;
  width: number;
  align: "left" | "right" | "center";
  x: number;
};

function buildItemTableColumns(tableLeft: number, tableWidth: number): PdfTableColumn[] {
  const wSku = 88;
  const wQty = 40;
  const wUnit = 56;
  const wLine = 62;
  const wProduct = tableWidth - wSku - wQty - wUnit - wLine;
  const defs: Omit<PdfTableColumn, "x">[] = [
    { label: "Product", width: wProduct, align: "left" },
    { label: "SKU", width: wSku, align: "left" },
    { label: "Qty", width: wQty, align: "right" },
    { label: "Unit", width: wUnit, align: "right" },
    { label: "Total", width: wLine, align: "right" },
  ];
  let x = tableLeft;
  return defs.map((col) => {
    const positioned = { ...col, x };
    x += col.width;
    return positioned;
  });
}

function strokeCell(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  height: number,
  opts?: { fill?: string; stroke?: string }
) {
  doc.save();
  if (opts?.fill) {
    doc.rect(x, y, width, height).fill(opts.fill);
  }
  doc
    .rect(x, y, width, height)
    .strokeColor(opts?.stroke ?? TABLE_BORDER)
    .lineWidth(0.5)
    .stroke();
  doc.restore();
}

function measureRowHeight(
  doc: InstanceType<typeof PDFDocument>,
  columns: PdfTableColumn[],
  values: string[],
  fontSize = 8
): number {
  doc.fontSize(fontSize);
  let height = MIN_DATA_ROW_HEIGHT;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]!;
    const value = values[i] ?? "";
    const textHeight = doc.heightOfString(value, { width: col.width - CELL_PAD * 2 });
    height = Math.max(height, textHeight + CELL_PAD * 2);
  }
  return height;
}

function drawCellText(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  col: PdfTableColumn,
  rowY: number,
  rowHeight: number,
  opts?: { color?: string; fontSize?: number }
) {
  doc.fontSize(opts?.fontSize ?? 8).fillColor(opts?.color ?? "#333333");
  doc.text(text, col.x + CELL_PAD, rowY + CELL_PAD, {
    width: col.width - CELL_PAD * 2,
    align: col.align,
    height: rowHeight - CELL_PAD * 2,
    lineBreak: true,
  });
}

function drawTableHeader(
  doc: InstanceType<typeof PDFDocument>,
  columns: PdfTableColumn[],
  y: number
): number {
  for (const col of columns) {
    strokeCell(doc, col.x, y, col.width, HEADER_ROW_HEIGHT, {
      fill: TABLE_HEADER_FILL,
      stroke: TABLE_HEADER_BORDER,
    });
    doc.fontSize(8).fillColor("#ffffff");
    doc.text(col.label, col.x + CELL_PAD, y + 6, {
      width: col.width - CELL_PAD * 2,
      align: col.align,
      lineBreak: false,
    });
  }
  return y + HEADER_ROW_HEIGHT;
}

function drawTableDataRow(
  doc: InstanceType<typeof PDFDocument>,
  columns: PdfTableColumn[],
  y: number,
  values: string[],
  rowFill?: string
): number {
  const rowHeight = measureRowHeight(doc, columns, values);
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]!;
    strokeCell(doc, col.x, y, col.width, rowHeight, rowFill ? { fill: rowFill } : undefined);
    drawCellText(doc, values[i] ?? "", col, y, rowHeight);
  }
  return y + rowHeight;
}

function drawPaymentScheduleTable(
  doc: InstanceType<typeof PDFDocument>,
  marginLeft: number,
  pageWidth: number,
  y: number,
  schedule: NonNullable<ReturnType<typeof computePaymentTermsSchedule>>,
  money: (n: number) => string,
  formatDue: (isoDate: string) => string
): number {
  const colNumW = 36;
  const colDueW = pageWidth - colNumW - 90;
  const colAmtW = 90;
  const xNum = marginLeft;
  const xDue = marginLeft + colNumW;
  const xAmt = marginLeft + pageWidth - colAmtW;
  const headerH = HEADER_ROW_HEIGHT;

  let rowY = y;
  doc.fontSize(10).fillColor("#1e3157").text("Payment schedule", marginLeft, rowY);
  rowY += 16;

  strokeCell(doc, xNum, rowY, colNumW, headerH, {
    fill: TABLE_HEADER_FILL,
    stroke: TABLE_HEADER_BORDER,
  });
  strokeCell(doc, xDue, rowY, colDueW, headerH, {
    fill: TABLE_HEADER_FILL,
    stroke: TABLE_HEADER_BORDER,
  });
  strokeCell(doc, xAmt, rowY, colAmtW, headerH, {
    fill: TABLE_HEADER_FILL,
    stroke: TABLE_HEADER_BORDER,
  });
  doc.fontSize(8).fillColor("#ffffff");
  doc.text("#", xNum + CELL_PAD, rowY + 6, { width: colNumW - CELL_PAD * 2, lineBreak: false });
  doc.text("Due date", xDue + CELL_PAD, rowY + 6, { width: colDueW - CELL_PAD * 2, lineBreak: false });
  doc.text("Amount", xAmt + CELL_PAD, rowY + 6, {
    width: colAmtW - CELL_PAD * 2,
    align: "right",
    lineBreak: false,
  });
  rowY += headerH;

  for (const inst of schedule.installments) {
    const rowH = MIN_DATA_ROW_HEIGHT;
    strokeCell(doc, xNum, rowY, colNumW, rowH);
    strokeCell(doc, xDue, rowY, colDueW, rowH);
    strokeCell(doc, xAmt, rowY, colAmtW, rowH);
    doc.fontSize(8).fillColor("#333333");
    doc.text(String(inst.installmentNumber), xNum + CELL_PAD, rowY + CELL_PAD, {
      width: colNumW - CELL_PAD * 2,
      lineBreak: false,
    });
    doc.text(formatDue(inst.dueDate), xDue + CELL_PAD, rowY + CELL_PAD, {
      width: colDueW - CELL_PAD * 2,
      lineBreak: false,
    });
    doc.text(money(inst.amount), xAmt + CELL_PAD, rowY + CELL_PAD, {
      width: colAmtW - CELL_PAD * 2,
      align: "right",
      lineBreak: false,
    });
    rowY += rowH;
  }

  const totalH = MIN_DATA_ROW_HEIGHT + 2;
  strokeCell(doc, xNum, rowY, colNumW + colDueW, totalH, { fill: "#e8eaf2" });
  strokeCell(doc, xAmt, rowY, colAmtW, totalH, { fill: "#e8eaf2" });
  doc.fontSize(9).fillColor("#1e3157");
  doc.text("Total", xDue + CELL_PAD, rowY + CELL_PAD, {
    width: colDueW - CELL_PAD * 2,
    align: "right",
    lineBreak: false,
  });
  doc.text(money(schedule.total), xAmt + CELL_PAD, rowY + CELL_PAD, {
    width: colAmtW - CELL_PAD * 2,
    align: "right",
    lineBreak: false,
  });
  return rowY + totalH + 8;
}

function drawSummaryTableRow(
  doc: InstanceType<typeof PDFDocument>,
  columns: PdfTableColumn[],
  y: number,
  label: string,
  value: string,
  opts?: {
    rowHeight?: number;
    labelColor?: string;
    valueColor?: string;
    fontSize?: number;
    fill?: string;
  }
): number {
  const rowHeight = opts?.rowHeight ?? MIN_DATA_ROW_HEIGHT + 2;
  const fontSize = opts?.fontSize ?? 9;
  const fill = opts?.fill;
  const labelColIndex = columns.length - 2;
  const valueColIndex = columns.length - 1;

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]!;
    strokeCell(doc, col.x, y, col.width, rowHeight, fill ? { fill } : undefined);
  }

  const labelCol = columns[labelColIndex]!;
  const valueCol = columns[valueColIndex]!;
  doc.fontSize(fontSize).fillColor(opts?.labelColor ?? "#666666");
  doc.text(label, labelCol.x + CELL_PAD, y + CELL_PAD, {
    width: labelCol.width - CELL_PAD * 2,
    align: "right",
    lineBreak: false,
  });
  doc.fillColor(opts?.valueColor ?? "#333333");
  doc.text(value, valueCol.x + CELL_PAD, y + CELL_PAD, {
    width: valueCol.width - CELL_PAD * 2,
    align: "right",
    lineBreak: false,
  });
  return y + rowHeight;
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

  const paymentTermsLabel = formatPurchaseOrderPaymentTerms(po.paymentTermsMonths);
  const paymentSchedule = computePaymentTermsSchedule({
    total: po.total ?? 0,
    paymentTermsMonths: po.paymentTermsMonths,
    termsStartDate: po.createdAt,
  });
  if (paymentTermsLabel) {
    doc.text(`Payment terms: ${txt(paymentTermsLabel)}`);
    if (paymentSchedule) {
      doc.text(
        txt(
          `${paymentSchedule.months} installments · ${money(paymentSchedule.installmentAmount)}/mo · Due through ${formatDateTimeInTimezone(paymentSchedule.finalDueDate, settings.timezone).slice(0, 10)}`
        )
      );
    }
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

  const tableLeft = marginLeft;
  const tableWidth = pageWidth;
  const columns = buildItemTableColumns(tableLeft, tableWidth);
  const pageBottomReserve = 140;

  let rowY = doc.y + 8;
  rowY = drawTableHeader(doc, columns, rowY);

  for (let index = 0; index < items.length; index++) {
    const item = items[index]!;
    const values = [
      txt(item.productName ?? ""),
      txt(item.sku ?? ""),
      String(item.quantity ?? 0),
      money(item.unitCost ?? 0),
      money(item.total ?? 0),
    ];
    const nextRowHeight = measureRowHeight(doc, columns, values);

    if (rowY + nextRowHeight > doc.page.height - doc.page.margins.bottom - pageBottomReserve) {
      doc.addPage();
      rowY = doc.page.margins.top;
      rowY = drawTableHeader(doc, columns, rowY);
    }

    const zebra = index % 2 === 1 ? "#f7f7f9" : undefined;
    rowY = drawTableDataRow(doc, columns, rowY, values, zebra);
  }

  if (rowY > doc.page.height - doc.page.margins.bottom - 80) {
    doc.addPage();
    rowY = doc.page.margins.top;
    rowY = drawTableHeader(doc, columns, rowY);
  }

  rowY = drawSummaryTableRow(doc, columns, rowY, "Subtotal", money(po.subtotal ?? 0), {
    fill: "#f0f0f4",
    labelColor: "#666666",
    valueColor: "#333333",
  });

  const discountAmount = po.discountAmount ?? 0;
  const discountPercent = po.discountPercent ?? 0;
  if (discountAmount > 0) {
    rowY = drawSummaryTableRow(
      doc,
      columns,
      rowY,
      `Discount (${discountPercent}%)`,
      `-${money(discountAmount)}`,
      {
        fill: "#eef6f1",
        labelColor: "#2d6a4f",
        valueColor: "#2d6a4f",
      }
    );
  }

  rowY = drawSummaryTableRow(doc, columns, rowY, "Total", money(po.total), {
    rowHeight: 22,
    fontSize: 10,
    fill: "#e8eaf2",
    labelColor: "#1e3157",
    valueColor: "#1e3157",
  });

  rowY += 8;

  if (paymentSchedule) {
    if (rowY > doc.page.height - doc.page.margins.bottom - pageBottomReserve) {
      doc.addPage();
      rowY = doc.page.margins.top;
    }
    const formatDue = (iso: string) =>
      sanitizePdfText(formatDateTimeInTimezone(iso, settings.timezone).slice(0, 10));
    rowY = drawPaymentScheduleTable(
      doc,
      marginLeft,
      pageWidth,
      rowY,
      paymentSchedule,
      money,
      formatDue
    );
  }

  doc.y = rowY;

  if (po.notes?.trim()) {
    if (rowY > doc.page.height - doc.page.margins.bottom - pageBottomReserve) {
      doc.addPage();
      rowY = doc.page.margins.top;
    }
    doc.fontSize(9).fillColor("#444444").text("Notes", marginLeft, rowY);
    doc.fontSize(9).fillColor("#333333").text(txt(po.notes.trim()), marginLeft, rowY + 14, {
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

  const footerY = doc.page.height - doc.page.margins.bottom - 16;
  if (doc.y > footerY - 8) {
    doc.addPage();
  }
  doc
    .fontSize(7)
    .fillColor("#999999")
    .text(
      txt(
        `Generated ${formatDateTimeInTimezone(new Date(), settings.timezone)} - ${settings.appName}`
      ),
      marginLeft,
      footerY,
      { align: "center", width: pageWidth, lineBreak: false }
    );

  return toBuffer();
}

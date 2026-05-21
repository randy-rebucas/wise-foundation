/**
 * Generates docs/roles-and-permissions-matrix.svg (and .png if resvg is available).
 * Run: node scripts/generate-permissions-matrix-image.mjs
 */
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outSvg = path.join(root, "docs", "roles-and-permissions-matrix.svg");
const outPng = path.join(root, "docs", "roles-and-permissions-matrix.png");

const roles = ["ADMIN", "ORG_ADMIN", "BRANCH_MGR", "INV_MGR", "STAFF", "MEMBER", "CUSTOMER"];
const roleLabels = ["ADMIN", "ORG_ADMIN", "BRANCH_MGR", "INV_MGR", "STAFF", "MEMBER", "CUSTOMER"];

const permMatrix = [
  ["manage:branches", [1, 0, 0, 0, 0, 0, 0]],
  ["manage:users", [1, 1, 0, 0, 0, 0, 0]],
  ["manage:products", [1, 0, 1, 1, 0, 0, 0]],
  ["manage:inventory", [1, 1, 1, 1, 0, 0, 0]],
  ["use:pos", [1, 1, 1, 0, 1, 0, 0]],
  ["view:reports", [1, 1, 1, 1, 0, 0, 0]],
  ["manage:members", [1, 0, 1, 0, 1, 0, 0]],
  ["manage:orders", [1, 1, 1, 0, 1, 0, 0]],
  ["manage:organizations", [1, 1, 0, 0, 0, 0, 0]],
  ["manage:roles", [1, 0, 0, 0, 0, 0, 0]],
  ["submit:org_orders", [2, 1, 0, 0, 0, 0, 0]],
  ["view:org_inventory", [2, 1, 0, 0, 0, 0, 0]],
  ["view:org_commissions", [2, 1, 0, 0, 0, 0, 0]],
  ["view:own_orders", [2, 0, 0, 0, 0, 1, 0]],
];

const sidebarRows = [
  ["Dashboard", "ADMIN role"],
  ["Org Dashboard / My Panel", "ORG_ADMIN"],
  ["POS", "use:pos"],
  ["Products / Media", "manage:products"],
  ["Inventory", "manage:inventory"],
  ["Orders", "manage:orders"],
  ["Purchase Orders", "inventory OR submit:org_orders"],
  ["Deliveries", "ADMIN, no organizationId"],
  ["Reseller / Commissions", "ADMIN or ORG_ADMIN"],
  ["Members", "manage:members"],
  ["Reports", "view:reports"],
  ["Admin Branches", "manage:branches"],
  ["Admin Users", "ADMIN only"],
  ["Admin Team", "ORG_ADMIN + manage:users"],
  ["Admin Organizations", "ADMIN only"],
];

const poRows = [
  ["List / view POs", "All", "Own org", "Branch scope"],
  ["Create / edit draft", "Yes", "Own org (creator)", "Yes"],
  ["Sign & submit", "Yes", "Yes", "Yes"],
  ["Approve", "Yes only", "No", "No"],
  ["Decline", "Yes only", "No", "No"],
  ["Receive / fulfill", "Yes", "Own org", "Yes"],
  ["Deliveries nav", "HQ ADMIN", "Hidden", "Hidden"],
];

const W = 1280;
const pad = 32;
const colPerm = 220;
const colRole = 72;
const rowH = 28;
const headerH = 36;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cellSymbol(v) {
  if (v === 1) return { text: "Y", fill: "#dcfce7", color: "#166534" };
  if (v === 2) return { text: "Y*", fill: "#fef9c3", color: "#854d0e" };
  return { text: "—", fill: "#f4f4f5", color: "#71717a" };
}

function drawTable(x, y, title, permColLabel, headers, rows, opts = {}) {
  const { isCheckMatrix = false, colWidths } = opts;
  const nCols = headers.length;
  const widths = colWidths ?? [
    colPerm,
    ...Array(nCols - 1).fill(colRole),
  ];
  const tableW = widths.reduce((a, b) => a + b, 0);
  let h = headerH + rows.length * rowH + 8;
  let svg = "";

  svg += `<text x="${x}" y="${y}" class="section-title">${esc(title)}</text>\n`;
  y += 28;

  svg += `<rect x="${x}" y="${y}" width="${tableW}" height="${h}" rx="8" fill="#fff" stroke="#e4e4e7"/>\n`;

  let cx = x;
  headers.forEach((hdr, i) => {
    svg += `<rect x="${cx}" y="${y}" width="${widths[i]}" height="${headerH}" fill="#18181b"/>`;
    svg += `<text x="${cx + widths[i] / 2}" y="${y + 23}" class="th" text-anchor="middle">${esc(hdr)}</text>`;
    cx += widths[i];
  });

  let ry = y + headerH;
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? "#fafafa" : "#ffffff";
    cx = x;
    row.forEach((cell, ci) => {
      let fill = bg;
      let text = String(cell);
      let color = "#18181b";
      let weight = "normal";
      if (isCheckMatrix && ci > 0) {
        const sym = cellSymbol(cell);
        fill = sym.fill;
        text = sym.text;
        color = sym.color;
        weight = "bold";
      }
      svg += `<rect x="${cx}" y="${ry}" width="${widths[ci]}" height="${rowH}" fill="${fill}"/>`;
      const anchor = ci === 0 ? "start" : "middle";
      const tx = ci === 0 ? cx + 10 : cx + widths[ci] / 2;
      const cls = ci === 0 ? "td-left" : "td";
      svg += `<text x="${tx}" y="${ry + 19}" class="${cls}" text-anchor="${anchor}" fill="${color}" font-weight="${weight}">${esc(text)}</text>`;
      cx += widths[ci];
    });
    ry += rowH;
  });

  return { svg, height: h + 56 };
}

let y = pad + 20;
let body = "";

body += `<text x="${pad}" y="${y}" class="main-title">Glowish — Roles &amp; Permissions Matrix</text>\n`;
body += `<text x="${pad}" y="${y + 22}" class="subtitle">Source: lib/permissions.ts · Sidebar · Purchase orders</text>\n`;
y += 52;

const permHeaders = ["Permission", ...roleLabels];
const permData = permMatrix.map(([name, vals]) => [name, ...vals]);
const t1 = drawTable(pad, y, "1. Role × permission (defaults)", "Permission", permHeaders, permData, {
  isCheckMatrix: true,
  colWidths: [colPerm, ...Array(7).fill(colRole)],
});
body += t1.svg;
y += t1.height + 24;

const t2 = drawTable(pad, y, "2. Sidebar navigation", "Nav item", ["Nav item", "Visible when"], sidebarRows, {
  colWidths: [200, W - pad * 2 - 200],
});
body += t2.svg;
y += t2.height + 24;

const t3 = drawTable(
  pad,
  y,
  "3. Purchase orders & deliveries",
  "Capability",
  ["Capability", "ADMIN (HQ)", "ORG_ADMIN", "Inventory staff"],
  poRows,
  { colWidths: [200, 280, 280, W - pad * 2 - 760] }
);
body += t3.svg;
y += t3.height + 16;

body += `<text x="${pad}" y="${y}" class="legend">Legend: Y = role default · Y* = ADMIN bypass (all checks) · — = not in defaults</text>\n`;
body += `<text x="${pad}" y="${y + 18}" class="legend">PO flow: draft → submitted → approved → received (or declined / cancelled)</text>\n`;

const totalH = y + 48;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}">
  <defs>
    <style>
      .main-title { font: 700 22px system-ui, -apple-system, Segoe UI, sans-serif; fill: #09090b; }
      .subtitle { font: 400 13px system-ui, sans-serif; fill: #71717a; }
      .section-title { font: 700 15px system-ui, sans-serif; fill: #18181b; }
      .th { font: 600 11px system-ui, sans-serif; fill: #fafafa; }
      .td { font: 600 12px system-ui, sans-serif; }
      .td-left { font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; fill: #3f3f46; }
      .legend { font: 400 11px system-ui, sans-serif; fill: #71717a; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#f4f4f5"/>
  ${body}
</svg>`;

writeFileSync(outSvg, svg, "utf8");
console.log("Wrote", outSvg);

const resvg = spawnSync(
  "npx",
  ["--yes", "@resvg/resvg-js-cli", outSvg, outPng],
  { cwd: root, shell: true, stdio: "pipe" }
);
if (resvg.status === 0) {
  console.log("Wrote", outPng);
} else {
  console.log("PNG skipped (install @resvg/resvg-js-cli or open the SVG). Open SVG in browser and export if needed.");
}

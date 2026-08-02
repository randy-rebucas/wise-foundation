export interface ReceiptItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

export interface ReceiptOrder {
  orderNumber: string;
  subtotal: number;
  discountAmount: number;
  shippingFee?: number;
  total: number;
  change?: number;
  paymentMethod: string;
}

export interface ReceiptPrintOptions {
  storeTitle: string;
  formatMoney: (n: number) => string;
  whenLabel: string;
  receiptFooter: string;
  logoSrc: string;
}

export function printReceipt(
  order: ReceiptOrder,
  items: ReceiptItem[],
  memberName: string | null,
  discountPercent: number,
  print: ReceiptPrintOptions
) {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  // Plain numeric format (e.g. "1,100.00") with no currency code — many
  // thermal receipt printers' built-in fonts can't render currency glyphs
  // and either drop them or print a garbled box, clipping the rest of the line.
  const fmt = (n: number) => print.formatMoney(n).replace(/^[^\d.,-]+\s*/, "");
  const safeFooter = print.receiptFooter
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const lines = items
    .map(
      (i) =>
        `<tr><td class="item">${i.name}<br/><small>${i.sku}</small></td><td class="srp">${fmt(i.price)}</td><td class="qty">${i.quantity}</td><td class="amt">${fmt(i.price * i.quantity)}</td></tr>`
    )
    .join("");
  const footerBlock = print.receiptFooter.trim()
    ? `<p style="margin-top:10px;font-size:11px;white-space:pre-wrap">${safeFooter}</p><p style="margin-top:8px">Thank you for your purchase!</p>`
    : `<p style="margin-top:12px">Thank you for your purchase!</p>`;
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
  <style>
    @page{size:80mm auto;margin:0}
    *{box-sizing:border-box}
    body{font-family:monospace;font-size:13px;width:100%;max-width:300px;margin:0 auto;padding:12px}
    .logo{display:block;margin:0 auto 8px;max-height:88px;width:auto}
    h2{text-align:center;margin:0 0 4px;font-size:16px}
    p{text-align:center;margin:2px 0;font-size:11px;word-break:break-word}
    table{width:100%;table-layout:fixed;border-collapse:collapse;margin:8px 0}
    th,td{padding:3px 0;vertical-align:top;word-break:break-word;overflow-wrap:break-word}
    .item{width:38%;text-align:left}
    .srp{width:20%;text-align:right;white-space:nowrap}
    .qty{width:12%;text-align:right}
    .amt{width:30%;text-align:right;white-space:nowrap}
    hr{border:none;border-top:1px dashed #999;margin:8px 0}
    .total td{font-weight:bold;font-size:15px}
    .change td{color:#16a34a;font-weight:bold}
    @media print{button{display:none}}
  </style></head><body>
  <img class="logo" src="${print.logoSrc.startsWith("http") ? print.logoSrc : `${typeof window !== "undefined" ? window.location.origin : ""}${print.logoSrc}`}" alt="" />
  <h2>${print.storeTitle}</h2>
  <p>${print.whenLabel}</p>
  <p>Order: <strong>${order.orderNumber}</strong></p>
  ${memberName ? `<p>Member: ${memberName} (${discountPercent}% off)</p>` : ""}
  <hr/>
  <table><colgroup><col class="item"/><col class="srp"/><col class="qty"/><col class="amt"/></colgroup>
  <thead><tr><th class="item">Item</th><th class="srp">SRP</th><th class="qty">Qty</th><th class="amt">Amount</th></tr></thead>
  <tbody>${lines}</tbody></table>
  <hr/>
  <table><colgroup><col style="width:68%"/><col class="amt"/></colgroup>
    <tr><td>Subtotal</td><td class="amt">${fmt(order.subtotal)}</td></tr>
    ${order.discountAmount > 0 ? `<tr><td>Discount</td><td class="amt">-${fmt(order.discountAmount)}</td></tr>` : ""}
    ${order.shippingFee && order.shippingFee > 0 ? `<tr><td>Shipping</td><td class="amt">${fmt(order.shippingFee)}</td></tr>` : ""}
    <tr class="total"><td>Total</td><td class="amt">${fmt(order.total)}</td></tr>
    ${order.paymentMethod === "cash" && order.change && order.change > 0 ? `<tr class="change"><td>Change</td><td class="amt">${fmt(order.change)}</td></tr>` : ""}
  </table>
  <hr/>
  <p>Payment: ${order.paymentMethod.toUpperCase()}</p>
  ${footerBlock}
  <br/><button onclick="window.print()">Print</button>
  <script>window.onload=function(){window.print();};</script>
  </body></html>`);
  w.document.close();
  w.focus();
}

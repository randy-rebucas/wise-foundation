export function statusDisplay(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "delivered" || normalized === "completed") {
    return { label: "Delivered", className: "bg-emerald-100 text-emerald-700" };
  }
  if (normalized === "paid" || normalized === "approved") {
    return { label: "Shipped", className: "bg-sky-100 text-sky-700" };
  }
  if (normalized === "cancelled" || normalized === "refunded") {
    return { label: "Cancelled", className: "bg-red-100 text-red-700" };
  }
  return { label: "Processing", className: "bg-orange-100 text-orange-700" };
}

export function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPhone(phone: string | null) {
  if (!phone?.trim()) return "—";
  return phone.trim();
}

export function formatMemberSince(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

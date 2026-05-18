import { listMyMarketplaceOrders } from "@/lib/services/customerOrders.service";
import type { OrderStatus } from "@/types";

export type CustomerNotification = {
  id: string;
  type: "order";
  title: string;
  message: string;
  href: string;
  createdAt: string;
};

function notificationCopy(status: OrderStatus, orderNumber: string) {
  switch (status) {
    case "paid":
    case "approved":
      return {
        title: `Order ${orderNumber} shipped`,
        message: "Your order is on the way. Track it in My Orders.",
      };
    case "delivered":
    case "completed":
      return {
        title: `Order ${orderNumber} delivered`,
        message: "Your package has been delivered. We hope you love it!",
      };
    case "cancelled":
      return {
        title: `Order ${orderNumber} cancelled`,
        message: "This order was cancelled. Contact us if you need help.",
      };
    case "refunded":
      return {
        title: `Order ${orderNumber} refunded`,
        message: "A refund has been processed for this order.",
      };
    default:
      return {
        title: `Order ${orderNumber} received`,
        message: "We're preparing your order. You'll get updates here.",
      };
  }
}

export async function listCustomerNotifications(
  customerUserId: string,
  limit = 30
): Promise<CustomerNotification[]> {
  const orders = await listMyMarketplaceOrders(customerUserId, limit);
  return orders.map((order) => {
    const copy = notificationCopy(order.status, order.orderNumber);
    return {
      id: `order-${order._id}`,
      type: "order" as const,
      title: copy.title,
      message: copy.message,
      href: "/account/orders",
      createdAt: order.paidAt ?? order.createdAt,
    };
  });
}

export const PAYMONGO_CHECKOUT_STORAGE_KEY = "glowish_paymongo_checkout";

export type PaymongoPendingCheckout = {
  items: { productId: string; variantId?: string | null; quantity: number }[];
  shipping: {
    fullName: string;
    email: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
  };
  shippingMethod: string;
  paymentMethod: "card" | "gcash" | "maya" | "grab_pay";
  notes?: string;
  saveAddress?: boolean;
  sessionId: string;
};

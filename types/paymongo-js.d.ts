/** PayMongo.js loaded from https://js.paymongo.com/v1 */

interface PaymongoCardElement {
  mount(selector: string): void;
  unmount(): void;
  on(event: "change", handler: (event: { error?: { message: string } }) => void): void;
}

interface PaymongoElements {
  create(type: "card", options?: { style?: Record<string, unknown> }): PaymongoCardElement;
}

interface PaymongoPaymentMethodResult {
  id: string;
  attributes?: {
    type?: string;
    details?: { last4?: string; brand?: string };
  };
}

interface PaymongoPaymentIntentAttachResult {
  id: string;
  attributes: {
    status: string;
    next_action?: {
      type?: string;
      redirect?: { url: string };
    } | null;
    last_payment_error?: { message?: string } | null;
  };
}

interface PaymongoInstance {
  elements(): PaymongoElements;
  createPaymentMethod(
    type: "card",
    options: {
      card: PaymongoCardElement;
      billing: { name: string; email: string; phone?: string };
    }
  ): Promise<PaymongoPaymentMethodResult>;
  createPaymentMethod(
    type: "gcash" | "paymaya" | "grab_pay",
    options: {
      billing: { name: string; email: string; phone?: string };
    }
  ): Promise<PaymongoPaymentMethodResult>;
}

interface PaymongoConstructor {
  new (publicKey: string): PaymongoInstance;
}

interface Window {
  Paymongo?: PaymongoConstructor;
}

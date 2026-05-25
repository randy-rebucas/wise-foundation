import { getPaymongoSecretKey } from "@/lib/paymongo/config";
import { withRetry } from "@/lib/utils/retry";

const PAYMONGO_API = "https://api.paymongo.com/v1";

type PaymongoResource<T> = {
  id: string;
  type: string;
  attributes: T;
};

type PaymongoResponse<T> = {
  data: PaymongoResource<T>;
};

type PaymongoListResponse<T> = {
  data: PaymongoResource<T>[];
};

export type PaymongoPaymentIntentAttributes = {
  amount: number;
  currency: string;
  status: string;
  client_key: string;
  payment_method_allowed: string[];
  payments?: { id: string; attributes?: { status?: string } }[];
  next_action?: {
    type?: string;
    redirect?: { url: string; return_url?: string };
  } | null;
  last_payment_error?: { message?: string } | null;
};

export type PaymongoPaymentMethodAttributes = {
  type: string;
  details?: {
    last4?: string;
    brand?: string;
    exp_month?: number;
    exp_year?: number;
  };
  billing?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

class PaymongoClientError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

async function paymongoRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; secretKey?: string } = {}
): Promise<T> {
  const secretKey = options.secretKey ?? getPaymongoSecretKey();
  const auth = Buffer.from(`${secretKey}:`).toString("base64");

  return withRetry(
    async () => {
      const res = await fetch(`${PAYMONGO_API}${path}`, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const json = (await res.json().catch(() => ({}))) as {
        data?: unknown;
        errors?: { detail?: string }[];
      };

      if (!res.ok) {
        const detail =
          json.errors?.[0]?.detail ?? `PayMongo request failed (${res.status})`;
        throw new PaymongoClientError(detail, res.status);
      }

      return json as T;
    },
    {
      attempts: 3,
      baseDelayMs: 300,
      // Don't retry client errors — they won't resolve
      shouldAbort: (err) =>
        err instanceof PaymongoClientError && err.status >= 400 && err.status < 500,
    }
  );
}

export async function createPaymentIntent(params: {
  amountCentavos: number;
  description: string;
  paymentMethodAllowed: string[];
  metadata?: Record<string, string>;
}) {
  if (params.amountCentavos < 2000) {
    throw new Error("PayMongo minimum charge is ₱20.00");
  }

  const body = {
    data: {
      attributes: {
        amount: params.amountCentavos,
        currency: "PHP",
        capture_type: "automatic",
        payment_method_allowed: params.paymentMethodAllowed,
        description: params.description.slice(0, 255),
        metadata: params.metadata,
      },
    },
  };

  const res = await paymongoRequest<PaymongoResponse<PaymongoPaymentIntentAttributes>>(
    "/payment_intents",
    { method: "POST", body }
  );
  return res.data;
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  const res = await paymongoRequest<PaymongoResponse<PaymongoPaymentIntentAttributes>>(
    `/payment_intents/${paymentIntentId}`
  );
  return res.data;
}

export async function attachPaymentIntent(params: {
  paymentIntentId: string;
  paymentMethodId: string;
  returnUrl?: string;
  clientKey?: string;
}) {
  const attributes: Record<string, string> = {
    payment_method: params.paymentMethodId,
  };
  if (params.returnUrl) attributes.return_url = params.returnUrl;
  if (params.clientKey) attributes.client_key = params.clientKey;

  const res = await paymongoRequest<PaymongoResponse<PaymongoPaymentIntentAttributes>>(
    `/payment_intents/${params.paymentIntentId}/attach`,
    {
      method: "POST",
      body: { data: { attributes } },
    }
  );
  return res.data;
}

export async function retrievePaymentMethod(paymentMethodId: string) {
  const res = await paymongoRequest<PaymongoResponse<PaymongoPaymentMethodAttributes>>(
    `/payment_methods/${paymentMethodId}`
  );
  return res.data;
}

export function paymentIntentIsPaid(status: string): boolean {
  return status === "succeeded" || status === "processing";
}

export function mapPaymongoBrand(brand?: string): "visa" | "mastercard" | "amex" | "unknown" {
  const b = (brand ?? "").toLowerCase();
  if (b.includes("visa")) return "visa";
  if (b.includes("master")) return "mastercard";
  if (b.includes("amex")) return "amex";
  return "unknown";
}

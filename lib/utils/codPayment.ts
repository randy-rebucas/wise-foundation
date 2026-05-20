/** Cash on delivery checkout validation. */

export interface ResolvedMarketplaceCodPayment {
  amountDue: number;
  prepareChangeFor?: number;
  changeToReturn?: number;
  codAcknowledged: true;
}

export function validateCodEntry(params: {
  acknowledged: boolean;
  amountDue: number;
  prepareChangeFor?: number;
  minOrderAmount?: number;
}): { ok: true; resolved: ResolvedMarketplaceCodPayment } | { ok: false; error: string } {
  const min = params.minOrderAmount ?? 0;
  if (params.amountDue < min) {
    return {
      ok: false,
      error: `Cash on delivery requires a minimum order of ₱${min.toLocaleString()}`,
    };
  }

  if (!params.acknowledged) {
    return { ok: false, error: "Please confirm you understand the cash on delivery terms" };
  }

  let prepareChangeFor: number | undefined;
  if (params.prepareChangeFor !== undefined && params.prepareChangeFor > 0) {
    prepareChangeFor = Math.round(params.prepareChangeFor * 100) / 100;
    if (prepareChangeFor < params.amountDue) {
      return {
        ok: false,
        error: "Amount you'll pay with must be at least the order total",
      };
    }
  }

  const changeToReturn =
    prepareChangeFor !== undefined
      ? Math.round((prepareChangeFor - params.amountDue) * 100) / 100
      : undefined;

  return {
    ok: true,
    resolved: {
      amountDue: params.amountDue,
      prepareChangeFor,
      changeToReturn: changeToReturn && changeToReturn > 0 ? changeToReturn : undefined,
      codAcknowledged: true,
    },
  };
}

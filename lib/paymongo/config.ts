/** PayMongo configuration (secret key server-only; public key for Elements). */

export function isPaymongoConfigured(): boolean {
  return Boolean(
    process.env.PAYMONGO_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY?.trim()
  );
}

export function getPaymongoSecretKey(): string {
  const key = process.env.PAYMONGO_SECRET_KEY?.trim();
  if (!key) throw new Error("PayMongo is not configured (missing PAYMONGO_SECRET_KEY)");
  return key;
}

export function getPaymongoPublicKey(): string {
  return process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY?.trim() ?? "";
}

export function phpAmountToCentavos(amount: number): number {
  return Math.round(amount * 100);
}

export function centavosToPhp(centavos: number): number {
  return Math.round(centavos) / 100;
}

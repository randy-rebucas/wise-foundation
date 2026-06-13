export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/startup/validateEnv");
    validateEnv();

    const { checkDbConnectivity } = await import("@/lib/startup/checkDbConnectivity");
    await checkDbConnectivity();
  }
}

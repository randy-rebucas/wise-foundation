export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    const { validateEnv } = await import("@/lib/startup/validateEnv");
    validateEnv();

    const { checkDbConnectivity } = await import("@/lib/startup/checkDbConnectivity");
    await checkDbConnectivity();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}


const PAYMONGO_SCRIPT = "https://js.paymongo.com/v1";
const LOAD_TIMEOUT_MS = 10_000;

export function loadPaymongoScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Paymongo) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("PayMongo.js timed out. Check your network connection.")),
      LOAD_TIMEOUT_MS
    );
    const done = (err?: Error) => {
      clearTimeout(timer);
      err ? reject(err) : resolve();
    };

    const existing = document.querySelector(`script[src="${PAYMONGO_SCRIPT}"]`);
    if (existing) {
      if (window.Paymongo) { done(); return; }
      existing.addEventListener("load", () => done());
      existing.addEventListener("error", () => done(new Error("PayMongo.js failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = PAYMONGO_SCRIPT;
    script.async = true;
    script.onload = () => done();
    script.onerror = () => done(new Error("PayMongo.js failed to load"));
    document.body.appendChild(script);
  });
}

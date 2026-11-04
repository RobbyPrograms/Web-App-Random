import Stripe from "stripe";

let client: Stripe | null = null;

function envValue(name: string): string | undefined {
  return process.env[name];
}

export function isStripeConfigured(): boolean {
  const secret = envValue("STRIPE_SECRET_KEY") ?? "";
  const monthly = envValue("STRIPE_PRICE_MONTHLY") ?? "";
  const yearly = envValue("STRIPE_PRICE_YEARLY") ?? "";
  if (secret.length < 8 || monthly.length < 8 || yearly.length < 8) return false;
  if (secret.includes("replace_me") || monthly.includes("replace_me") || yearly.includes("replace_me")) return false;
  return true;
}

export function getStripe(): Stripe | null {
  const secret = envValue("STRIPE_SECRET_KEY");
  if (!secret || secret.includes("replace_me")) return null;
  if (!client) {
    client = new Stripe(secret);
  }
  return client;
}

export function priceIdFor(plan: "monthly" | "yearly"): string | null {
  if (plan === "monthly") return envValue("STRIPE_PRICE_MONTHLY") ?? null;
  return envValue("STRIPE_PRICE_YEARLY") ?? null;
}

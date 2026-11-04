import Stripe from "stripe";

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  const monthly = process.env.STRIPE_PRICE_MONTHLY ?? "";
  const yearly = process.env.STRIPE_PRICE_YEARLY ?? "";
  if (secret.length < 8 || monthly.length < 8 || yearly.length < 8) return false;
  if (secret.includes("replace_me") || monthly.includes("replace_me") || yearly.includes("replace_me")) return false;
  return true;
}

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

export function priceIdFor(plan: "monthly" | "yearly"): string | null {
  if (plan === "monthly") return process.env.STRIPE_PRICE_MONTHLY ?? null;
  return process.env.STRIPE_PRICE_YEARLY ?? null;
}

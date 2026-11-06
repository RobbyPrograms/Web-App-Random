import Stripe from "stripe";

function usable(value: string | undefined): value is string {
  if (!value || value.trim().length < 12) return false;
  return !value.includes("replace_me") && !value.includes("your-");
}

export function isStripeConfigured(): boolean {
  return usable(process.env["STRIPE_SECRET_KEY"]);
}

export function getStripe(): Stripe {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!usable(key)) throw new Error("Stripe is not configured");
  return new Stripe(key);
}

export function priceIdFor(plan: "monthly" | "yearly"): string | null {
  const id = plan === "yearly" ? process.env["STRIPE_PRICE_YEARLY"] : process.env["STRIPE_PRICE_MONTHLY"];
  if (!usable(id)) return null;
  return id;
}

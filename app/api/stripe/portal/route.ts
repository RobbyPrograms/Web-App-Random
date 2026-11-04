import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { viewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const who = await viewer();
  if (!who.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!who.stripeCustomerId) {
    return NextResponse.json({ error: "No billing profile yet. Start Pro from the pricing section." }, { status: 400 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe test keys are not configured yet." }, { status: 503 });
  }
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe is unavailable." }, { status: 503 });
  const session = await stripe.billingPortal.sessions.create({
    customer: who.stripeCustomerId,
    return_url: `${siteUrl()}/settings`,
  });
  return NextResponse.json({ url: session.url });
}

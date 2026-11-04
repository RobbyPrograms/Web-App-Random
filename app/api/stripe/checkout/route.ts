import { NextResponse } from "next/server";
import { z } from "zod";
import { siteUrl } from "@/lib/site";
import { getStripe, isStripeConfigured, priceIdFor } from "@/lib/stripe";
import { viewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({ plan: z.enum(["monthly", "yearly"]) });

export async function POST(request: Request) {
  const who = await viewer();
  if (!who.userId) {
    return NextResponse.json({ error: "Sign in before starting Pro." }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe test keys are not configured yet." }, { status: 503 });
  }
  const stripe = getStripe();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !stripe) {
    return NextResponse.json({ error: "Choose monthly or yearly." }, { status: 400 });
  }
  const price = priceIdFor(parsed.data.plan);
  if (!price) {
    return NextResponse.json({ error: "That price is not configured." }, { status: 503 });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: who.stripeCustomerId ?? undefined,
    client_reference_id: who.userId,
    customer_email: who.stripeCustomerId ? undefined : who.email ?? undefined,
    line_items: [{ price, quantity: 1 }],
    success_url: `${siteUrl()}/settings?checkout=success`,
    cancel_url: `${siteUrl()}/settings?checkout=cancel`,
    metadata: { user_id: who.userId },
    subscription_data: { metadata: { user_id: who.userId } },
  });
  if (!session.url) {
    return NextResponse.json({ error: "Checkout could not be opened." }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}

import { NextResponse } from "next/server";
import { proUpdateFromStripeEvent } from "@/lib/stripe-sync";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret || secret.includes("replace")) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  const update = proUpdateFromStripeEvent(event);
  const admin = createAdminSupabase();
  if (update && admin) {
    await admin.from("profiles").update({ is_pro: update.isPro, stripe_customer_id: update.customerId }).eq("id", update.userId);
  }
  return NextResponse.json({ received: true });
}

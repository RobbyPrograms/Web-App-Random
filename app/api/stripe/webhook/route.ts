import { NextResponse } from "next/server";
import { proUpdateFromStripeEvent, type StripeLikeEvent } from "@/lib/stripe-sync";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!stripe || !secret || secret.includes("replace_me")) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const payload = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const update = proUpdateFromStripeEvent(event as unknown as StripeLikeEvent);
  if (!update) return NextResponse.json({ received: true, ignored: true });

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });

  if (update.userId) {
    await admin
      .from("profiles")
      .update({ is_pro: update.isPro, stripe_customer_id: update.customerId })
      .eq("id", update.userId);
  } else {
    await admin.from("profiles").update({ is_pro: update.isPro }).eq("stripe_customer_id", update.customerId);
  }
  return NextResponse.json({ received: true });
}

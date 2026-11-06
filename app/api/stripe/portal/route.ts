import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { viewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function POST() {
  const who = await viewer();
  if (!who.userId) {
    return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing portal is not configured yet." }, { status: 503 });
  }
  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Accounts are not configured." }, { status: 503 });
  }
  const { data } = await supabase.from("profiles").select("stripe_customer_id").eq("id", who.userId).maybeSingle();
  const customer = data && typeof data.stripe_customer_id === "string" ? data.stripe_customer_id : null;
  if (!customer) {
    return NextResponse.json({ error: "No billing profile yet." }, { status: 404 });
  }
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${siteUrl()}/settings`,
  });
  return NextResponse.json({ url: session.url });
}

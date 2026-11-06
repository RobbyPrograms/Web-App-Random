export interface ProUpdate {
  userId: string;
  isPro: boolean;
  customerId: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/** Pure mapping from a Stripe event payload to a profile billing update. */
export function proUpdateFromStripeEvent(event: { type: string; data: { object: unknown } }): ProUpdate | null {
  const object = asRecord(event.data.object);
  if (!object) return null;
  if (event.type === "checkout.session.completed") {
    if (object.mode !== "subscription") return null;
    const meta = asRecord(object.metadata);
    const userId = (typeof object.client_reference_id === "string" && object.client_reference_id) || (typeof meta?.user_id === "string" ? meta.user_id : "");
    if (!userId) return null;
    const customer = typeof object.customer === "string" ? object.customer : null;
    return { userId, isPro: true, customerId: customer };
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const meta = asRecord(object.metadata);
    const userId = typeof meta?.user_id === "string" ? meta.user_id : "";
    if (!userId) return null;
    const status = typeof object.status === "string" ? object.status : "";
    const customer = typeof object.customer === "string" ? object.customer : null;
    const isPro = event.type === "customer.subscription.deleted" ? false : status === "active" || status === "trialing";
    return { userId, isPro, customerId: customer };
  }
  return null;
}

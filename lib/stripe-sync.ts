export interface ProUpdate {
  customerId: string;
  isPro: boolean;
  userId: string | null;
}

interface StripeObject {
  mode?: unknown;
  customer?: unknown;
  client_reference_id?: unknown;
  status?: unknown;
  metadata?: unknown;
}

export interface StripeLikeEvent {
  type: string;
  data: { object: StripeObject };
}

function customerId(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("cus_") ? value : null;
}

function userIdFrom(object: StripeObject): string | null {
  if (typeof object.client_reference_id === "string" && object.client_reference_id.length > 0) {
    return object.client_reference_id;
  }
  const metadata = object.metadata;
  if (metadata && typeof metadata === "object" && "user_id" in metadata) {
    const userId = (metadata as { user_id?: unknown }).user_id;
    if (typeof userId === "string" && userId.length > 0) return userId;
  }
  return null;
}

/**
 * Map a Stripe webhook event onto the profile columns we store.
 * Active and trialing subscriptions grant Pro. Deleted or unpaid subscriptions remove it.
 */
export function proUpdateFromStripeEvent(event: StripeLikeEvent): ProUpdate | null {
  if (event.type === "checkout.session.completed") {
    if (event.data.object.mode !== "subscription") return null;
    const customer = customerId(event.data.object.customer);
    if (!customer) return null;
    return { customerId: customer, isPro: true, userId: userIdFrom(event.data.object) };
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const customer = customerId(event.data.object.customer);
    if (!customer) return null;
    const status = typeof event.data.object.status === "string" ? event.data.object.status : "";
    const isPro =
      event.type === "customer.subscription.updated" && (status === "active" || status === "trialing");
    return { customerId: customer, isPro, userId: null };
  }

  return null;
}

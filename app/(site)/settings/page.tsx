import { CheckoutButton } from "@/components/checkout-button";
import { SettingsPanel } from "@/components/settings-panel";
import { viewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const who = await viewer();
  const query = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-5xl">Settings</h1>
      <div className="mt-6">
        <SettingsPanel
          email={who.email}
          username={who.username}
          isPro={who.isPro}
          hasBilling={Boolean(who.stripeCustomerId)}
          checkout={query.checkout ?? null}
        />
      </div>
      {who.userId && !who.isPro && (
        <div className="mt-8 grid gap-3">
          <CheckoutButton plan="monthly" label="Pro monthly · $3.99" signedIn />
          <CheckoutButton plan="yearly" label="Pro yearly · $29.99" signedIn />
        </div>
      )}
    </div>
  );
}

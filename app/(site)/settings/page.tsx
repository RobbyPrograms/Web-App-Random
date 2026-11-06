import { SettingsPanel } from "@/components/settings-panel";
import { viewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const who = await viewer();
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-5xl">Settings</h1>
      <div className="mt-6">
        <SettingsPanel email={who.email} username={who.username} />
      </div>
    </div>
  );
}

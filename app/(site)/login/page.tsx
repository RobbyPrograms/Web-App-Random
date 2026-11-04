import { LoginForm } from "@/components/login-form";
import { isSupabaseConfigured } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const query = await searchParams;
  const nextPath = query.next?.startsWith("/") ? query.next : "/play";
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-5xl">Sign in</h1>
      <p className="mt-2 text-[var(--muted)]">Magic link or Google. Optional, and it never blocks the daily puzzle.</p>
      <div className="mt-6">
        <LoginForm nextPath={nextPath} configured={isSupabaseConfigured()} />
      </div>
    </div>
  );
}

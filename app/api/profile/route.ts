import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { viewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  username: z.string().trim().regex(/^[A-Za-z0-9_]{3,20}$/, "Use 3-20 letters, numbers, or underscores."),
});

export async function POST(request: Request) {
  const who = await viewer();
  if (!who.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check that username." }, { status: 400 });
  }
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Accounts are not configured." }, { status: 503 });
  const { error } = await supabase.from("profiles").update({ username: parsed.data.username }).eq("id", who.userId);
  if (error) {
    const taken = error.code === "23505";
    return NextResponse.json(
      { error: taken ? "That username is taken." : "Could not save the username." },
      { status: taken ? 409 : 500 },
    );
  }
  return NextResponse.json({ ok: true, username: parsed.data.username });
}

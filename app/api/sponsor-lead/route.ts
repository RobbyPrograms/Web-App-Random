import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  company: z.string().trim().max(80).optional(),
  message: z.string().trim().min(10).max(2000),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Add a name, a real email, and a short note." }, { status: 400 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "The lead inbox is not connected yet." }, { status: 503 });
  }
  const { error } = await admin.from("sponsor_leads").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company || null,
    message: parsed.data.message,
  });
  if (error) return NextResponse.json({ error: "Could not save that note. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

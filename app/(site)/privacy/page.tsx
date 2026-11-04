export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-sm leading-6 text-[var(--muted)]">
      <h1 className="font-display text-5xl text-[var(--text)]">Privacy</h1>
      <p>BOXED can be played without an account. An anonymous id stays in local storage so a game can resume and, if you later sign in, move onto your profile.</p>
      <p>If you sign in, we store your email through Supabase Auth, an optional username, and the puzzles you have played: sport, puzzle number, guesses, score, and whether you solved it. We do not sell that list.</p>
      <p>Pro billing is handled by Stripe. We store a customer id and whether the subscription is active. Card numbers stay with Stripe.</p>
      <p>Sponsor inquiries save the name, email, company, and message you submit on the advertise form.</p>
      <p>The optional service worker only runs in production and does not cache your guesses. Sound is synthesized in the browser and never uploaded.</p>
      <p>To remove an account, sign in and contact the operator of this deployment. Deleting the auth user removes the profile, plays, streaks, and league memberships.</p>
    </article>
  );
}

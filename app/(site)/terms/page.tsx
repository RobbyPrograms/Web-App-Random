export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-sm leading-6 text-[var(--muted)]">
      <h1 className="font-display text-5xl text-[var(--text)]">Terms</h1>
      <p>BOXED is a daily guessing game. Season lines are trivia prompts, not official league statistics. Check the verification list before you treat a number as final.</p>
      <p>Not affiliated with or endorsed by any league, team, or player. Team names are used to identify a season. The product does not use league logos or player marks.</p>
      <p>Play is offered as-is. There is no subscription.</p>
      <p>Leagues are private to people who hold the invite code. Don&apos;t share a code you don&apos;t want others to use. Creating or joining a league requires an account.</p>
      <p>Don&apos;t attack the service, scrape it in a way that degrades play, or submit guesses you don&apos;t intend as a game. Rate limits apply.</p>
      <p>Sponsor placements are labeled. A sponsor does not pick the athlete or the stat line.</p>
    </article>
  );
}

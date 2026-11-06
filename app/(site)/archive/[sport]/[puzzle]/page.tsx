import { PlayExperience } from "@/components/play-experience";
import { readStreak } from "@/lib/plays-store";
import { viewer } from "@/lib/viewer";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ArchivePuzzlePage({ params }: { params: Promise<{ sport: string; puzzle: string }> }) {
  const { sport, puzzle } = await params;
  const puzzleNumber = Number(puzzle);
  if (!Number.isInteger(puzzleNumber)) notFound();
  const who = await viewer();
  const streak = await readStreak(who.userId, sport);
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <PlayExperience
        sportId={sport}
        puzzleNumber={puzzleNumber}
        signedIn={Boolean(who.userId)}
        initialStreak={streak}
        variant="full"
      />
    </div>
  );
}

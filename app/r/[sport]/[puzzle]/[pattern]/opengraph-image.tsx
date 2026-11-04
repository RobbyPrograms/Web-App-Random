import { ImageResponse } from "next/og";
import { isLegalPattern } from "@/lib/share";
import { getEnabledSports, getSportById } from "@/sports/registry";

export const runtime = "nodejs";
export const alt = "BOXED result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ sport: string; puzzle: string; pattern: string }>;
}) {
  const { sport: sportId, puzzle, pattern } = await params;
  const known = getSportById(sportId);
  const enabled = getEnabledSports();
  const legal = known && enabled.some((sport) => sport.id === known.id) && isLegalPattern(pattern.toUpperCase());
  const squares = legal ? pattern.toUpperCase().split("") : ["B", "O", "X", "E", "D", "!"];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0A0A0F",
          color: "#F4F4F5",
          padding: 64,
        }}
      >
        <div style={{ fontSize: 36, letterSpacing: 6, color: "#A1A1AA" }}>
          {legal ? `${known?.emoji ?? ""} BOXED #${puzzle}` : "BOXED"}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 28 }}>
          {squares.map((cell, index) => (
            <div
              key={`${cell}-${index}`}
              style={{
                width: 120,
                height: 120,
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 42,
                background: cell === "G" ? "#22C55E" : cell === "R" ? "#EF4444" : "#27272A",
                color: "#0A0A0F",
              }}
            >
              {cell === "W" ? "" : cell}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

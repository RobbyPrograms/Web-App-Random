import { ImageResponse } from "next/og";
import { isGridPattern, isLegalPattern } from "@/lib/share";
import { getEnabledSports, getSportById } from "@/sports/registry";

export const runtime = "nodejs";
export const alt = "BOXED result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function color(cell: string): string {
  if (cell === "G") return "#22C55E";
  if (cell === "Y" || cell === "R") return "#EAB308";
  return "#2A2A33";
}

export default async function Image({
  params,
}: {
  params: Promise<{ sport: string; puzzle: string; pattern: string }>;
}) {
  const { sport: sportId, puzzle, pattern } = await params;
  const known = getSportById(sportId);
  const enabled = getEnabledSports();
  const upper = pattern.toUpperCase();
  const grid = isGridPattern(upper);
  const legacy = !grid && isLegalPattern(upper);
  const legal = Boolean(known && enabled.some((sport) => sport.id === known.id) && (grid || legacy));
  const rows = grid ? upper.split("-") : legacy ? [upper] : ["BOXED!"];
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: "flex", gap: 12 }}>
              {row.split("").map((cell, index) => (
                <div
                  key={`${cell}-${index}`}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    background: color(cell),
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

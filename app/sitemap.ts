import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { getEnabledSports } from "@/sports/registry";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const sports = getEnabledSports();
  const paths = ["", "/play", "/stats", "/archive", "/leagues", "/advertise", "/privacy", "/terms", "/embed", "/embed-builder", "/login", "/settings"];
  if (sports.length > 1) {
    for (const sport of sports) paths.push(`/play/${sport.id}`, `/embed/${sport.id}`);
  } else {
    for (const sport of sports) paths.push(`/embed/${sport.id}`);
  }
  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    changeFrequency: path === "" || path.startsWith("/play") ? "daily" : "weekly",
    priority: path === "" || path === "/play" ? 1 : 0.6,
  }));
}

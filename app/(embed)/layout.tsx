export const dynamic = "force-dynamic";

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="content" className="min-h-screen px-3 py-4">
      {children}
    </main>
  );
}

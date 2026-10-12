import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LEVELS, getLevel } from "@/data/levels";
import { GameScreen } from "@/components/game/GameScreen";

export function generateStaticParams() {
  return LEVELS.map((l) => ({ levelId: l.id }));
}

export async function generateMetadata({ params }: PageProps<"/play/[levelId]">): Promise<Metadata> {
  const { levelId } = await params;
  const level = getLevel(levelId);
  return { title: level ? `${level.name} · Perfectly Organized` : "Perfectly Organized" };
}

// Params are awaited inside Suspense so the route keeps a static shell (Cache Components).
async function LevelRoute({ params }: { params: PageProps<"/play/[levelId]">["params"] }) {
  const { levelId } = await params;
  if (!getLevel(levelId)) notFound();
  return <GameScreen levelId={levelId} />;
}

export default function PlayPage({ params }: PageProps<"/play/[levelId]">) {
  return (
    <Suspense fallback={<main className="h-dvh" aria-busy="true" />}>
      <LevelRoute params={params} />
    </Suspense>
  );
}

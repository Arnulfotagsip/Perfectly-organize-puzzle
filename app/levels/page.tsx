import type { Metadata } from "next";
import { LevelSelect } from "@/components/menus/LevelSelect";

export const metadata: Metadata = { title: "Levels · Perfectly Organized" };

export default function LevelsPage() {
  return <LevelSelect />;
}

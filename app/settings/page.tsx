import type { Metadata } from "next";
import { SettingsPanel } from "@/components/menus/SettingsPanel";

export const metadata: Metadata = { title: "Settings · Perfectly Organized" };

export default function SettingsPage() {
  return <SettingsPanel />;
}

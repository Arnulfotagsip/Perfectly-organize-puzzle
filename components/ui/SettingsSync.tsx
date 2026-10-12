"use client";

import { useEffect } from "react";
import { useSave } from "@/lib/persistence/store";

/** Mirrors theme and motion settings onto <html> so CSS can react to them. */
export function SettingsSync() {
  const save = useSave();
  const theme = save?.settings.theme;
  const motion = save?.settings.motion;
  useEffect(() => {
    if (!theme || !motion) return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.motion = motion;
  }, [theme, motion]);
  return null;
}

/** True when animations should be minimised, honouring both the setting and the OS preference. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const pref = document.documentElement.dataset.motion;
  if (pref === "reduced") return true;
  if (pref === "full") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

"use client";

import { useState } from "react";
import { defaultSave, type MotionPref, type Settings, type Theme } from "@/lib/persistence/progress";
import { updateSave, useSave } from "@/lib/persistence/store";
import { playSound } from "@/lib/audio/sound";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";

const THEMES: { id: Theme; name: string; swatch: string[] }[] = [
  { id: "cream", name: "Cream", swatch: ["#fbf5ec", "#b9a6e8", "#9fd8c4"] },
  { id: "mint", name: "Mint", swatch: ["#eef7f2", "#2f8a6c", "#a9cdef"] },
  { id: "dusk", name: "Dusk", swatch: ["#26222f", "#c3b2f2", "#f6b8a6"] },
];

const MOTION: { id: MotionPref; name: string; note: string }[] = [
  { id: "system", name: "Match device", note: "Follows your system's reduced-motion setting." },
  { id: "full", name: "Full", note: "All snaps, sparkles and celebrations." },
  { id: "reduced", name: "Reduced", note: "Minimal movement; feedback stays visible as text and icons." },
];

function set<K extends keyof Settings>(key: K, value: Settings[K]) {
  updateSave((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
}

export function SettingsPanel() {
  const save = useSave();
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wiped, setWiped] = useState(false);
  const settings = save?.settings;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-[max(env(safe-area-inset-top),1.25rem)] sm:px-8">
      <nav className="flex items-center gap-2">
        <ButtonLink href="/" variant="ghost" size="icon" aria-label="Home">
          <Icon name="back" />
        </ButtonLink>
        <h1 className="flex-1 text-2xl font-extrabold sm:text-3xl">Settings</h1>
      </nav>

      {settings && (
        <div className="mt-6 flex flex-col gap-4">
          <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
            <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
              <span className="flex items-center gap-3">
                <Icon name={settings.sound ? "sound" : "mute"} className="text-primary" />
                <span>
                  <span className="block font-extrabold">Sound effects</span>
                  <span className="block text-sm text-muted">Soft clicks and chimes as things snap into place.</span>
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={settings.sound}
                onChange={(e) => {
                  set("sound", e.target.checked);
                  if (e.target.checked) playSound("correct");
                }}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="relative h-8 w-14 shrink-0 rounded-full bg-line transition peer-checked:bg-success peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-6"
              />
            </label>
            <p className="mt-2 pl-9 text-xs text-muted">There&apos;s no background music, so there&apos;s nothing else to mute.</p>
          </section>

          <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
            <fieldset>
              <legend className="font-extrabold">Animations</legend>
              <div className="mt-3 grid gap-2">
                {MOTION.map((m) => (
                  <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${settings.motion === m.id ? "border-primary bg-primary-soft" : "border-line hover:bg-surface-2"}`}>
                    <input type="radio" name="motion" value={m.id} checked={settings.motion === m.id} onChange={() => set("motion", m.id)} className="mt-1 size-4 accent-[var(--primary)]" />
                    <span>
                      <span className="block font-bold">{m.name}</span>
                      <span className="block text-sm text-muted">{m.note}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
            <fieldset>
              <legend className="font-extrabold">Theme</legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <label key={t.id} className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border p-3 transition ${settings.theme === t.id ? "border-primary bg-primary-soft" : "border-line hover:bg-surface-2"}`}>
                    <input type="radio" name="theme" value={t.id} checked={settings.theme === t.id} onChange={() => set("theme", t.id)} className="sr-only" />
                    <span className="flex -space-x-2" aria-hidden>
                      {t.swatch.map((c) => (
                        <span key={c} className="size-8 rounded-full border-2 border-surface shadow-sm" style={{ background: c }} />
                      ))}
                    </span>
                    <span className="font-bold">{t.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
            <h2 className="font-extrabold">Progress</h2>
            <p className="mt-1 text-sm text-muted">Progress is saved on this device only.</p>
            <Button className="mt-3" icon="reset" onClick={() => setConfirmWipe(true)}>
              Reset all progress
            </Button>
            {wiped && (
              <p role="status" className="mt-2 text-sm font-bold text-success">
                Progress cleared. Level 1 is waiting for you.
              </p>
            )}
          </section>
        </div>
      )}

      <Dialog open={confirmWipe} onClose={() => setConfirmWipe(false)} title="Reset all progress?" labelledBy="wipe-title">
        <p className="text-muted">This clears stars, unlocked levels and unfinished boards. Your settings stay as they are.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmWipe(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              updateSave((s) => ({ ...defaultSave(), settings: s.settings }));
              setConfirmWipe(false);
              setWiped(true);
            }}
          >
            Reset progress
          </Button>
        </div>
      </Dialog>
    </main>
  );
}

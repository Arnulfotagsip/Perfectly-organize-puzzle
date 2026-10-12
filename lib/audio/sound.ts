"use client";

import { readSave } from "@/lib/persistence/store";

// Soft synthesized sounds: no audio files to load, and nothing harsh — even "wrong" is a gentle low tone.

export type SoundName = "pickup" | "snap" | "correct" | "reject" | "rotate" | "complete" | "tap";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  freq: number,
  { at = 0, dur = 0.12, type = "sine", gain = 0.06, glide }: { at?: number; dur?: number; type?: OscillatorType; gain?: number; glide?: number } = {},
) {
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const SOUNDS: Record<SoundName, (ac: AudioContext) => void> = {
  pickup: (ac) => tone(ac, 420, { dur: 0.09, type: "triangle", gain: 0.05, glide: 560 }),
  tap: (ac) => tone(ac, 600, { dur: 0.05, type: "triangle", gain: 0.035 }),
  rotate: (ac) => tone(ac, 500, { dur: 0.08, type: "triangle", gain: 0.04, glide: 640 }),
  snap: (ac) => {
    tone(ac, 190, { dur: 0.07, type: "triangle", gain: 0.09 });
    tone(ac, 1250, { dur: 0.03, type: "sine", gain: 0.02 });
  },
  correct: (ac) => {
    tone(ac, 190, { dur: 0.07, type: "triangle", gain: 0.08 });
    tone(ac, 784, { at: 0.04, dur: 0.16, gain: 0.05 });
    tone(ac, 1175, { at: 0.11, dur: 0.22, gain: 0.04 });
  },
  reject: (ac) => tone(ac, 330, { dur: 0.18, type: "sine", gain: 0.045, glide: 262 }),
  complete: (ac) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, { at: i * 0.09, dur: 0.4, gain: 0.05 }));
    tone(ac, 1568, { at: 0.42, dur: 0.6, gain: 0.025 });
  },
};

export function playSound(name: SoundName): void {
  try {
    if (!readSave().settings.sound) return;
    const ac = audio();
    if (ac) SOUNDS[name](ac);
  } catch {
    // Audio is optional; never let it interrupt play.
  }
}

"use client";

import { useEffect, useRef } from "react";

const CELEBRATED_KEY = "khamar-first-animal-celebrated";
const CONFETTI_DURATION = 1500;
const CONFETTI_COLORS = ["#1b7f4b", "#e8821e", "#f9a825", "#2e7d32", "#c0392b"];

export function FirstAnimalCelebration({ trigger = false, onDone }) {
  const celebratedRef = useRef(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!trigger || celebratedRef.current) return undefined;
    if (window.localStorage.getItem(CELEBRATED_KEY) === "1") {
      celebratedRef.current = true;
      return undefined;
    }

    celebratedRef.current = true;
    let cancelled = false;
    let timer;

    async function celebrate() {
      try {
        const { default: confetti } = await import("canvas-confetti");
        if (cancelled) return;

        window.localStorage.setItem(CELEBRATED_KEY, "1");
        confetti({
          particleCount: 90,
          spread: 70,
          startVelocity: 30,
          origin: { y: 0.7 },
          colors: CONFETTI_COLORS,
          duration: CONFETTI_DURATION,
          disableForReducedMotion: true,
        });
        timer = window.setTimeout(() => {
          if (!cancelled) onDoneRef.current?.();
        }, CONFETTI_DURATION);
      } catch {
        celebratedRef.current = false;
        if (!cancelled) onDoneRef.current?.();
      }
    }

    celebrate();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [trigger]);

  return null;
}

"use client";

import { useEffect } from "react";

export function AutoRefresh({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => window.location.reload(), 5_000);
    return () => window.clearInterval(id);
  }, [active]);

  return null;
}

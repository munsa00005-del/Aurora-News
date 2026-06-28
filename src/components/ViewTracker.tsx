"use client";

// Fire-and-forget view counter — pings /api/view once per article mount.
// Feeds the engagement signal in the trending algorithm.

import { useEffect } from "react";

export default function ViewTracker({ id }: { id: string }) {
  useEffect(() => {
    const key = `viewed_${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      keepalive: true,
    }).catch(() => {});
  }, [id]);
  return null;
}

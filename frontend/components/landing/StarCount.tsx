"use client";

import { useEffect, useState } from "react";

const REPO = "Sudharsanselvaraj/Token-Print";
const API = `https://api.github.com/repos/${REPO}`;
const STATIC_URL = "/stars.json";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function StarCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const readStaticFallback = () =>
      fetch(STATIC_URL, { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<{ stars?: number }>) : null))
        .then((data) => {
          if (!cancelled && typeof data?.stars === "number") setCount(data.stars);
        })
        .catch(() => {});

    const readLive = () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      return fetch(API, { cache: "no-store", signal: controller.signal })
        .then((res) => (res.ok ? (res.json() as Promise<{ stargazers_count?: number }>) : null))
        .then((data) => {
          clearTimeout(timer);
          if (!cancelled && typeof data?.stargazers_count === "number" && data.stargazers_count > 0) {
            setCount(data.stargazers_count);
          } else {
            readStaticFallback();
          }
        })
        .catch(() => {
          clearTimeout(timer);
          readStaticFallback();
        });
    };

    void readLive();
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  return (
    <span className="github-star-count" title={`${count} stars`} aria-label={`${count} stars`}>
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="none"
        aria-hidden="true"
      >
        <path d="M12 2l2.9 6.26 6.6.57-5 4.36 1.5 6.56L12 16.6l-6 3.15 1.5-6.56-5-4.36 6.6-.57z" />
      </svg>
      {formatCount(count)}
    </span>
  );
}
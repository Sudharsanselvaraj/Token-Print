"use client";

import React, { useEffect, useState } from "react";
import { TOKENS } from "./primitives";

export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type?: string;
  role?: string;
}

const REPO_OWNER = "Sudharsanselvaraj";
const REPO_NAME = "Token-Print";

export default function ContributorsSection() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadContributors() {
      setLoading(true);
      setError(null);

      try {
        let data: Contributor[] = [];
        try {
          const staticRes = await fetch("/contributors.json");
          if (staticRes.ok) {
            data = await staticRes.json();
          }
        } catch {
          /* Fallback to live API if static JSON isn't present */
        }

        if (!data || data.length === 0) {
          const res = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contributors?per_page=100`
          );

          if (!res.ok) {
            if (res.status === 403) {
              throw new Error("GitHub API rate limit reached.");
            }
            throw new Error(`GitHub API error: ${res.status}`);
          }

          data = await res.json();
        }

        if (alive) {
          const sorted = data
            .filter((c) => c.type !== "Bot" && c.login !== "Copilot")
            .sort((a, b) => b.contributions - a.contributions);

          setContributors(sorted);
        }
      } catch (err: any) {
        if (alive) {
          setError(err.message ?? "Failed to load contributors");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadContributors();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "12px" }}>
        <div
          style={{
            fontSize: "9.5px",
            fontWeight: 700,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "#71717a",
            fontFamily: TOKENS.fontSans,
          }}
        >
          CONTRIBUTORS
        </div>
        <div style={{ fontSize: "11.5px", color: "#a1a1aa" }}>
          People who have helped build, test, document, and improve TokenPrint.
        </div>
      </div>

      {loading ? (
        <div
          style={{
            padding: "16px",
            border: "1px solid #26262b",
            borderRadius: 6,
            background: "rgba(255,255,255,0.015)",
            fontSize: "11px",
            color: "#71717a",
            fontFamily: TOKENS.fontMono,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "#3c3c42",
              borderTopColor: "#a1a1aa",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <span>Fetching contributors from GitHub...</span>
        </div>
      ) : error ? (
        <div
          style={{
            padding: "14px 16px",
            border: "1px solid #26262b",
            borderRadius: 6,
            background: "rgba(255,255,255,0.015)",
            fontSize: "11px",
            color: "#a1a1aa",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>{error}</span>
          <a
            href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/graphs/contributors`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "10.5px",
              color: "#f4f4f5",
              textDecoration: "none",
              border: "1px solid #3c3c42",
              padding: "4px 8px",
              borderRadius: 4,
              fontFamily: TOKENS.fontMono,
            }}
          >
            View on GitHub ↗
          </a>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "8px",
          }}
        >
          {contributors.map((c) => {
            const isCreator = c.login.toLowerCase() === REPO_OWNER.toLowerCase();
            const role = isCreator ? "Creator" : "Contributor";

            return (
              <a
                key={c.login}
                href={c.html_url}
                target="_blank"
                rel="noreferrer"
                title={`${c.login} (${c.contributions} contribution${c.contributions === 1 ? "" : "s"})`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid #26262b",
                  borderRadius: "6px",
                  textDecoration: "none",
                  transition: "all 0.12s ease",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.avatar_url}
                  alt={c.login}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "1px solid #3c3c42",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#f4f4f5",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.login}
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontFamily: TOKENS.fontMono,
                      color: "#71717a",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {role}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

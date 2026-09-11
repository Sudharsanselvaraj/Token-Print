"use client";

import React, { useEffect, useState } from "react";

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
        // 1. Attempt static cached list first (to preserve rate limits)
        let data: Contributor[] = [];
        try {
          const staticRes = await fetch("/contributors.json");
          if (staticRes.ok) {
            data = await staticRes.json();
          }
        } catch {
          /* Fallback to live API if static JSON isn't present */
        }

        // 2. Fetch live data from GitHub API if static data is empty
        if (!data || data.length === 0) {
          const res = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contributors?per_page=100`
          );

          if (!res.ok) {
            if (res.status === 403) {
              throw new Error("GitHub API rate limit reached. Please try again later.");
            }
            throw new Error(`GitHub API error: ${res.status}`);
          }

          data = await res.json();
        }

        if (alive) {
          // Filter out bots (optional, e.g. Copilot if preferred, or mark them)
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
    <div className="contributors-container">
      <div className="contributors-header">
        <div className="contributors-title-group">
          <div className="contributors-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 className="contributors-heading">Contributors</h3>
            <p className="contributors-subheading">
              Thanks to these amazing people for making <span className="highlight-text">TokenPrint</span>!
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="contributors-loading">
          <div className="contributors-spinner" />
          <span>Fetching contributors from GitHub…</span>
        </div>
      ) : error ? (
        <div className="contributors-error">
          <span>{error}</span>
          <a
            href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/graphs/contributors`}
            target="_blank"
            rel="noreferrer"
            className="chip-btn"
          >
            View on GitHub
          </a>
        </div>
      ) : (
        <div className="contributors-grid">
          {contributors.map((c) => {
            const isCreator = c.login.toLowerCase() === REPO_OWNER.toLowerCase();
            const badgeLabel = isCreator ? "Creator" : "Contributor";

            return (
              <a
                key={c.login}
                href={c.html_url}
                target="_blank"
                rel="noreferrer"
                className="contributor-card"
                title={`${c.login} (${c.contributions} contribution${c.contributions === 1 ? "" : "s"})`}
              >
                <div className={`avatar-wrapper ${isCreator ? "creator-ring" : "contrib-ring"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.avatar_url} alt={c.login} className="contributor-avatar" />
                </div>
                <span className="contributor-name">{c.login}</span>
                <span className={`contributor-badge ${isCreator ? "creator" : "contrib"}`}>
                  {badgeLabel}
                </span>
              </a>
            );
          })}
        </div>
      )}

      <div className="contributors-footer">
        <div className="footer-tag">
          <span className="tag-icon">★</span>
          <span>Build together</span>
        </div>
        <div className="footer-divider">|</div>
        <div className="footer-tag">
          <span className="tag-icon">👥</span>
          <span>Learn together</span>
        </div>
        <div className="footer-divider">|</div>
        <div className="footer-tag">
          <span className="tag-icon">🚀</span>
          <span>Create impact</span>
        </div>
      </div>
    </div>
  );
}

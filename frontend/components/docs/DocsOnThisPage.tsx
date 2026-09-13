"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function DocsOnThisPage() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const mainContainer = document.getElementById("docs-main-content");
      const els = Array.from(
        document.querySelectorAll(".docs-content h2, .docs-content h3")
      ) as HTMLElement[];

      const parsed: HeadingItem[] = els.map((el, index) => {
        let id = el.id;
        if (!id) {
          id = slugify(el.textContent || `heading-${index}`);
          el.id = id;
        }
        return {
          id,
          text: el.textContent || "",
          level: parseInt(el.tagName[1], 10),
        };
      });

      setHeadings(parsed);
      if (parsed.length > 0) {
        setActiveId(parsed[0].id);
      }

      if (parsed.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
            }
          });
        },
        {
          root: mainContainer,
          rootMargin: "-20px 0px -65% 0px",
          threshold: 0,
        }
      );

      els.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }, 50);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (headings.length === 0) return null;

  return (
    <nav className="docs-otp" aria-label="On this page navigation">
      <p className="docs-otp-label">ON THIS PAGE</p>
      <ul className="docs-otp-list">
        {headings.map((h) => (
          <li
            key={h.id}
            className={`docs-otp-item${h.level === 3 ? " docs-otp-item--sub" : ""}`}
          >
            <a
              href={`#${h.id}`}
              className={`docs-otp-link${activeId === h.id ? " docs-otp-link--active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                const target = document.getElementById(h.id);
                if (target) {
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
                  setActiveId(h.id);
                  history.pushState(null, "", `#${h.id}`);
                }
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

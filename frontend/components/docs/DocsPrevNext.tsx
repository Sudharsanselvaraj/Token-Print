import Link from "next/link";
import { getPrevNext } from "@/lib/docsNav";

interface DocsPrevNextProps {
  slug: string;
}

export default function DocsPrevNext({ slug }: DocsPrevNextProps) {
  const { prev, next } = getPrevNext(slug);

  if (!prev && !next) return null;

  return (
    <nav className="docs-prevnext" aria-label="Page navigation">
      <div className="docs-prevnext-inner">
        {prev ? (
          <Link href={`/docs/${prev.slug}`} className="docs-prevnext-link docs-prevnext-link--prev">
            <span className="docs-prevnext-dir">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Previous
            </span>
            <span className="docs-prevnext-title">{prev.title}</span>
          </Link>
        ) : (
          <div />
        )}

        {next ? (
          <Link href={`/docs/${next.slug}`} className="docs-prevnext-link docs-prevnext-link--next">
            <span className="docs-prevnext-dir">
              Next
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="docs-prevnext-title">{next.title}</span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </nav>
  );
}

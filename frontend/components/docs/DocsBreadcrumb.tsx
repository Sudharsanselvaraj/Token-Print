import Link from "next/link";
import { DOC_SECTIONS, getSectionForSlug } from "@/lib/docsNav";

interface DocsBreadcrumbProps {
  slug: string;
  title: string;
}

export default function DocsBreadcrumb({ slug, title }: DocsBreadcrumbProps) {
  const section = getSectionForSlug(slug);

  return (
    <nav className="docs-breadcrumb" aria-label="Breadcrumb">
      <Link href="/docs" className="docs-breadcrumb-link">
        Docs
      </Link>
      {section && (
        <>
          <span className="docs-breadcrumb-sep">/</span>
          <span className="docs-breadcrumb-section">{section}</span>
        </>
      )}
      <span className="docs-breadcrumb-sep">/</span>
      <span className="docs-breadcrumb-current">{title}</span>
    </nav>
  );
}

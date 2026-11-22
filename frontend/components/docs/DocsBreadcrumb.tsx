export interface DocsBreadcrumbProps {
  slug: string;
  title: string;
}

export default function DocsBreadcrumb({ slug, title }: DocsBreadcrumbProps) {
  // Breadcrumbs are rendered natively by TopBar in the linear docs shell
  return null;
}

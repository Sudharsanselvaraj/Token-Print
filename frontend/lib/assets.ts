export const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE ?? "";

export function assetUrl(path: string): string {
  return path.startsWith("/") ? `${ASSET_BASE}${path}` : path;
}
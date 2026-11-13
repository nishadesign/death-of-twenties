// Public files follow Vite's deployment base, while local development stays at /.
export function assetUrl(path: string, base = import.meta.env?.BASE_URL ?? '/') {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}

/** Prepend basePath so static-exported pages still resolve assets under GH Pages. */
export function asset(url: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const clean = url.startsWith('/') ? url : `/${url}`;
  return `${base}${clean}`;
}

export function formatStrength(s: number): string {
  const sign = s >= 0 ? '+' : '−';
  return `${sign}${Math.abs(s).toFixed(3)}`;
}

export function strengthColor(s: number): string {
  // negative → cool, positive → warm. used for the strength chip background.
  if (s === 0) return '#566073';
  if (s < 0) {
    const t = Math.min(1, Math.abs(s));
    const r = Math.round(91 + (40 - 91) * t);
    const g = Math.round(139 + (90 - 139) * t);
    const b = Math.round(255 + (200 - 255) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const t = Math.min(1, s);
  const r = Math.round(255 + (240 - 255) * t);
  const g = Math.round(170 + (110 - 170) * t);
  const b = Math.round(110 + (90 - 110) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

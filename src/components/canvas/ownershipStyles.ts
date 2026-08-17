"use client";

// ---------------------------------------------------------------------------
// Ownership colors — same stable hash-picked-hue trick as domainStyles.ts's
// EMERGENT_RGB, since authors have no fixed taxonomy the way domains do.
// ---------------------------------------------------------------------------

type Rgb = [number, number, number];

const AUTHOR_RGB: Rgb[] = [
  [99, 102, 241],  [236, 72, 153],  [20, 184, 166],  [59, 130, 246],
  [168, 85, 247],  [234, 179, 8],   [34, 197, 94],   [251, 113, 133],
  [125, 211, 252], [253, 186, 116], [244, 63, 94],   [132, 204, 22],
];

export interface OwnerStyle {
  badgeBg:     string;
  badgeBorder: string;
  badgeText:   string;
  dot:         string;
  pillBg:      string;
  pillBorder:  string;
}

function styleFromRgb([r, g, b]: Rgb): OwnerStyle {
  return {
    badgeBg:     `rgba(${r},${g},${b},0.14)`,
    badgeBorder: `rgba(${r},${g},${b},0.45)`,
    badgeText:   `rgba(${r},${g},${b},0.95)`,
    dot:         `rgba(${r},${g},${b},0.90)`,
    pillBg:      `rgba(${r},${g},${b},0.10)`,
    pillBorder:  `rgba(${r},${g},${b},0.50)`,
  };
}

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export function getOwnerStyle(authorKey: string | null | undefined): OwnerStyle {
  if (!authorKey) return styleFromRgb([113, 113, 122]); // zinc — no data
  return styleFromRgb(AUTHOR_RGB[hashString(authorKey) % AUTHOR_RGB.length]);
}

/** "Jane Doe" → "JD"; single-word names use the first two letters. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Bus-factor risk: one person wrote the overwhelming majority of the cluster. */
export const BUS_FACTOR_THRESHOLD = 80;

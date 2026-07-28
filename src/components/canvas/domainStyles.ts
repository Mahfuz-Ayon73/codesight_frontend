"use client";

import type { BlueprintCluster } from "@/types/project/project.schema";

// ---------------------------------------------------------------------------
// Domain colors — canonical taxonomy gets fixed hues (mirrors the analyzer's
// domain_detection.py taxonomy); emergent domains get a stable hash-picked hue
// so the same domain name renders the same color at every level and session.
// ---------------------------------------------------------------------------

type Rgb = [number, number, number];

const CANONICAL_RGB: Record<string, Rgb> = {
  AUTHENTICATION:     [245, 158, 11],   // amber
  REGISTRATION:       [132, 204, 22],   // lime
  PAYMENTS:           [16, 185, 129],   // emerald
  USER_PROFILE:       [14, 165, 233],   // sky
  EMAIL_NOTIFICATION: [139, 92, 246],   // violet
  ADMIN:              [244, 63, 94],    // rose
  FILE_STORAGE:       [249, 115, 22],   // orange
  SEARCH:             [6, 182, 212],    // cyan
  API_INTEGRATION:    [217, 70, 239],   // fuchsia
  INFRASTRUCTURE:     [100, 116, 139],  // slate
};

const EMERGENT_RGB: Rgb[] = [
  [99, 102, 241],  [236, 72, 153],  [20, 184, 166],  [59, 130, 246],
  [168, 85, 247],  [234, 179, 8],   [34, 197, 94],   [251, 113, 133],
  [125, 211, 252], [253, 186, 116],
];

const UNCLASSIFIED_RGB: Rgb = [113, 113, 122]; // zinc

export const UNCLASSIFIED_DOMAIN_KEY = "UNCLASSIFIED";

export interface DomainStyle {
  badgeBg:     string;
  badgeBorder: string;
  badgeText:   string;
  dot:         string;
  // Pill overrides for "color by domain" mode — same alpha convention as
  // CLUSTER_COLORS (border ends in "0.50") so ClusterGroupNode's
  // `.replace("0.50", …)` derivations keep working.
  pillBg:      string;
  pillBorder:  string;
}

function styleFromRgb([r, g, b]: Rgb): DomainStyle {
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

export function getDomainStyle(domain: string | null | undefined): DomainStyle {
  if (!domain || domain === UNCLASSIFIED_DOMAIN_KEY) return styleFromRgb(UNCLASSIFIED_RGB);
  const canonical = CANONICAL_RGB[domain];
  if (canonical) return styleFromRgb(canonical);
  return styleFromRgb(EMERGENT_RGB[hashString(domain) % EMERGENT_RGB.length]);
}

/** Grouping key for filtering — clusters without a domain fall into UNCLASSIFIED. */
export function clusterDomainKey(c: Pick<BlueprintCluster, "domain" | "domain_type">): string {
  return c.domain ?? UNCLASSIFIED_DOMAIN_KEY;
}

/** "EMAIL_NOTIFICATION" → "Email Notification"; emergent names pass through. */
export function formatDomainLabel(domain: string): string {
  return domain
    .split(/[_\s]+/)
    .map((w) => (w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w))
    .join(" ");
}

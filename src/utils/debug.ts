export const isDev = process.env.NODE_ENV === "development";

export function debug(...args: unknown[]) {
  if (isDev) console.log("[CodeSight]", ...args);
}

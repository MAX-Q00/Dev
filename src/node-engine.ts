export type VersionTriple = [number, number, number];

export function parseVersionTriple(version: string): VersionTriple {
  const cleaned = version.trim().replace(/^v/i, "").split("-")[0] ?? "";
  const [major = "0", minor = "0", patch = "0"] = cleaned.split(".");
  const triple: VersionTriple = [
    Number(major),
    Number(minor),
    Number(patch),
  ];
  if (triple.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Invalid version: ${version}`);
  }
  return triple;
}

export function compareVersions(a: VersionTriple, b: VersionTriple): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) {
      return a[i] < b[i] ? -1 : 1;
    }
  }
  return 0;
}

const DEFAULT_NODE_RANGE = ">=22.12.0";

export function defaultNodeRange(): string {
  return DEFAULT_NODE_RANGE;
}

/**
 * Supports simple npm engine ranges used by this repo, e.g. ">=22.12.0".
 * Also handles space-separated AND comparators: ">=22.12.0 <23".
 */
export function satisfiesNodeRange(version: string, range: string): boolean {
  const ver = parseVersionTriple(version);
  const tokens = range.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    throw new Error("Empty engines.node range");
  }

  return tokens.every((token) => matchesComparator(ver, token));
}

function matchesComparator(ver: VersionTriple, token: string): boolean {
  const match = token.match(/^(>=|>|<=|<|=)?v?(\d+(?:\.\d+){0,2})$/);
  if (!match) {
    throw new Error(`Unsupported engines.node comparator: ${token}`);
  }

  const op = match[1] || "=";
  const target = parseVersionTriple(match[2]);
  const cmp = compareVersions(ver, target);

  switch (op) {
    case ">=":
      return cmp >= 0;
    case ">":
      return cmp > 0;
    case "<=":
      return cmp <= 0;
    case "<":
      return cmp < 0;
    default:
      return cmp === 0;
  }
}

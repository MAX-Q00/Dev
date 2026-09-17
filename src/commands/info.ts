import { getConfig } from "../config.js";

export type InfoSnapshot = {
  name: string;
  version: string;
  description: string | undefined;
  node: string;
  platform: string;
  arch: string;
  cwd: string;
  scripts: string[];
};

export function collectInfo(): InfoSnapshot {
  const config = getConfig();
  return {
    name: config.name,
    version: config.version,
    description: config.description,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    scripts: Object.keys(config.scripts),
  };
}

export function formatInfo(snapshot = collectInfo()): string {
  const rows: Array<[string, string]> = [
    ["name", snapshot.name],
    ["version", snapshot.version],
  ];

  if (snapshot.description) {
    rows.push(["description", snapshot.description]);
  }

  rows.push(
    ["node", snapshot.node],
    ["platform", snapshot.platform],
    ["arch", snapshot.arch],
    ["cwd", snapshot.cwd],
    [
      "scripts",
      snapshot.scripts.length > 0 ? snapshot.scripts.join(", ") : "(none)",
    ],
  );

  const width = Math.max(...rows.map(([key]) => key.length));
  return rows.map(([key, value]) => `${key.padEnd(width)}  ${value}`).join("\n");
}

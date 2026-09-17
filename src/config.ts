import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type AppConfig = {
  name: string;
  version: string;
};

export function getConfig(): AppConfig {
  const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    name: string;
    version: string;
  };

  return {
    name: pkg.name,
    version: pkg.version,
  };
}

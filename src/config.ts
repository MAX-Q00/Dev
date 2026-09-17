import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type PackageBin = string | Record<string, string>;

export type PackageJson = {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  types?: string;
  bin?: PackageBin;
  scripts?: Record<string, string>;
  engines?: {
    node?: string;
  };
};

export type AppConfig = {
  name: string;
  version: string;
  description: string | undefined;
  main: string | undefined;
  types: string | undefined;
  bin: PackageBin | undefined;
  scripts: Record<string, string>;
  enginesNode: string | undefined;
  pkg: PackageJson;
  pkgPath: string;
  rootDir: string;
};

export function getPkgPath(): string {
  return fileURLToPath(new URL("../package.json", import.meta.url));
}

export function getRootDir(): string {
  return dirname(getPkgPath());
}

export function readPackageJson(pkgPath = getPkgPath()): PackageJson {
  return JSON.parse(readFileSync(pkgPath, "utf8")) as PackageJson;
}

export function getConfig(): AppConfig {
  const pkgPath = getPkgPath();
  const pkg = readPackageJson(pkgPath);

  return {
    name: pkg.name ?? "maxq-dev",
    version: pkg.version ?? "0.0.0",
    description: pkg.description,
    main: pkg.main,
    types: pkg.types,
    bin: pkg.bin,
    scripts: pkg.scripts ?? {},
    enginesNode: pkg.engines?.node,
    pkg,
    pkgPath,
    rootDir: dirname(pkgPath),
  };
}

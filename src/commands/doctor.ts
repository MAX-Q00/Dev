import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { getConfig, type PackageBin, type PackageJson } from "../config.js";
import {
  defaultNodeRange,
  satisfiesNodeRange,
} from "../node-engine.js";

export type DoctorCheck = {
  id: string;
  ok: boolean;
  reason: string;
};

export type DoctorResult = {
  ok: boolean;
  checks: DoctorCheck[];
  output: string;
};

const DIST_ARTIFACTS = ["dist/index.js", "dist/program.js"];

export function runDoctor(): DoctorResult {
  const config = getConfig();
  const checks: DoctorCheck[] = [
    checkNodeEngine(process.version, config.enginesNode),
    checkPackageFields(config.pkg),
    checkBinPath(config.rootDir, config.bin),
    checkDistArtifacts(config.rootDir),
  ];

  const distOk = checks.find((check) => check.id === "dist")?.ok ?? false;
  checks.push(
    distOk
      ? checkSmoke(config.rootDir, config.bin)
      : {
          id: "smoke",
          ok: false,
          reason: "skipped because dist/ artifacts are missing — run npm run build",
        },
  );

  const ok = checks.every((check) => check.ok);
  return {
    ok,
    checks,
    output: formatDoctor(config.name, checks),
  };
}

export function checkNodeEngine(
  nodeVersion: string,
  enginesNode: string | undefined,
): DoctorCheck {
  const range = enginesNode?.trim() || defaultNodeRange();
  const documented = Boolean(enginesNode?.trim());

  try {
    const ok = satisfiesNodeRange(nodeVersion, range);
    if (!documented) {
      return {
        id: "node",
        ok: false,
        reason: `package.json engines.node is missing (document ${defaultNodeRange()}); current ${nodeVersion}`,
      };
    }
    return {
      id: "node",
      ok,
      reason: ok
        ? `Node ${nodeVersion} satisfies engines.node ${range}`
        : `Node ${nodeVersion} does not satisfy engines.node ${range}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: "node",
      ok: false,
      reason: `could not evaluate engines.node: ${message}`,
    };
  }
}

export function checkPackageFields(pkg: PackageJson): DoctorCheck {
  const missing: string[] = [];

  if (!isNonEmptyString(pkg.name)) missing.push("name");
  if (!isNonEmptyString(pkg.version)) missing.push("version");
  if (!hasBin(pkg.bin)) missing.push("bin");

  if (pkg.main !== undefined && !isNonEmptyString(pkg.main)) {
    missing.push("main");
  }
  if (pkg.types !== undefined && !isNonEmptyString(pkg.types)) {
    missing.push("types");
  }

  if (missing.length > 0) {
    return {
      id: "package",
      ok: false,
      reason: `package.json missing or empty: ${missing.join(", ")}`,
    };
  }

  const extras: string[] = ["name", "version", "bin"];
  if (isNonEmptyString(pkg.main)) extras.push("main");
  if (isNonEmptyString(pkg.types)) extras.push("types");

  return {
    id: "package",
    ok: true,
    reason: `package.json has ${extras.join(", ")}`,
  };
}

export function checkBinPath(
  rootDir: string,
  bin: PackageBin | undefined,
): DoctorCheck {
  const binPaths = resolveBinPaths(bin);
  if (binPaths.length === 0) {
    return {
      id: "bin",
      ok: false,
      reason: "package.json bin does not point at any files",
    };
  }

  const missing = binPaths.filter((rel) => !existsSync(join(rootDir, rel)));
  if (missing.length > 0) {
    return {
      id: "bin",
      ok: false,
      reason: `bin path missing: ${missing.join(", ")}`,
    };
  }

  return {
    id: "bin",
    ok: true,
    reason: `bin resolves (${binPaths.join(", ")})`,
  };
}

export function checkDistArtifacts(rootDir: string): DoctorCheck {
  const missing = DIST_ARTIFACTS.filter(
    (rel) => !existsSync(join(rootDir, rel)),
  );
  if (missing.length > 0) {
    return {
      id: "dist",
      ok: false,
      reason: `missing ${missing.join(", ")} — run npm run build`,
    };
  }

  return {
    id: "dist",
    ok: true,
    reason: `${DIST_ARTIFACTS.join(", ")} exist`,
  };
}

export function checkSmoke(
  rootDir: string,
  bin: PackageBin | undefined,
): DoctorCheck {
  const cli = join(rootDir, "dist/index.js");
  const help = spawnSync(process.execPath, [cli, "--help"], {
    encoding: "utf8",
    cwd: rootDir,
  });

  if (help.status !== 0) {
    return {
      id: "smoke",
      ok: false,
      reason: `dist/index.js --help exited ${help.status ?? "non-zero"}`,
    };
  }

  const binPaths = resolveBinPaths(bin);
  for (const rel of binPaths) {
    const result = spawnSync(process.execPath, [join(rootDir, rel), "--help"], {
      encoding: "utf8",
      cwd: rootDir,
    });
    if (result.status !== 0) {
      return {
        id: "smoke",
        ok: false,
        reason: `${rel} --help exited ${result.status ?? "non-zero"}`,
      };
    }
  }

  return {
    id: "smoke",
    ok: true,
    reason: "program loads (dist/index.js and bin --help exited 0)",
  };
}

export function formatDoctor(name: string, checks: DoctorCheck[]): string {
  const lines = [`doctor  ${name}`, ""];
  const idWidth = Math.max(...checks.map((check) => check.id.length));

  for (const check of checks) {
    const badge = check.ok ? "PASS" : "FAIL";
    lines.push(
      `${badge}  ${check.id.padEnd(idWidth)}  ${check.reason}`,
    );
  }

  const passed = checks.filter((check) => check.ok).length;
  const failed = checks.length - passed;
  lines.push("");
  if (failed === 0) {
    lines.push(`All ${checks.length} checks passed`);
  } else {
    lines.push(`${failed} failed, ${passed} passed`);
  }

  return lines.join("\n");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasBin(bin: PackageBin | undefined): boolean {
  if (typeof bin === "string") {
    return bin.trim().length > 0;
  }
  if (!bin || typeof bin !== "object") {
    return false;
  }
  const values = Object.values(bin);
  return values.length > 0 && values.every((value) => isNonEmptyString(value));
}

function resolveBinPaths(bin: PackageBin | undefined): string[] {
  if (typeof bin === "string") {
    return bin.trim() ? [bin.trim()] : [];
  }
  if (!bin || typeof bin !== "object") {
    return [];
  }
  return Object.values(bin)
    .filter((value) => isNonEmptyString(value))
    .map((value) => value.trim());
}

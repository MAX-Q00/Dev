import { spawnSync } from "node:child_process";
import { getConfig } from "../config.js";

const QUALITY_SCRIPTS = ["build", "test"] as const;

export function runCheck(): number {
  const config = getConfig();
  const missing = QUALITY_SCRIPTS.filter((name) => !config.scripts[name]);
  if (missing.length > 0) {
    console.error(
      `check: package.json scripts missing: ${missing.join(", ")}`,
    );
    return 1;
  }

  console.log(`check  ${config.name}@${config.version}`);

  for (const script of QUALITY_SCRIPTS) {
    console.log(`\n==> npm run ${script}`);
    const result = spawnSync("npm", ["run", script], {
      cwd: config.rootDir,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });

    if (result.error) {
      console.error(`check: failed to start npm run ${script}: ${result.error.message}`);
      return 1;
    }

    if (result.status !== 0) {
      const code = result.status ?? 1;
      console.error(`check: npm run ${script} failed (exit ${code})`);
      return code;
    }
  }

  console.log("\ncheck: build and test passed");
  return 0;
}

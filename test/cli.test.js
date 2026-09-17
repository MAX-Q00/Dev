import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.join(testDir, "../package.json"), "utf8"),
);
const cli = path.join(testDir, "../dist/index.js");
const bin = path.join(testDir, "../bin/maxq-dev.js");

function runCli(...args) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
  });
}

test("hello prints a greeting and the package version", () => {
  const result = runCli("hello");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), `Hello from ${pkg.name} v${pkg.version}`);
});

test("version command prints the package version", () => {
  const result = runCli("version");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), pkg.version);
});

test("--version prints the package version", () => {
  const result = runCli("--version");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), pkg.version);
});

test("-v prints the package version", () => {
  const result = runCli("-v");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), pkg.version);
});

test("package bin hello works", () => {
  const result = spawnSync(process.execPath, [bin, "hello"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), `Hello from ${pkg.name} v${pkg.version}`);
});

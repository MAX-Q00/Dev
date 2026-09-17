import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  commandModuleSource,
  patchProgram,
  patchReadme,
  runNewCommand,
  validateCommandName,
} from "../dist/commands/new-command.js";
import {
  checkNodeEngine,
  checkPackageFields,
} from "../dist/commands/doctor.js";

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

test("--help lists lab-bench commands", () => {
  const result = runCli("--help");
  assert.equal(result.status, 0, result.stderr);
  for (const name of ["hello", "version", "info", "doctor", "check", "new"]) {
    assert.match(result.stdout, new RegExp(`\\b${name}\\b`));
  }
});

test("info prints a project and runtime snapshot", () => {
  const result = runCli("info");
  assert.equal(result.status, 0, result.stderr);
  const output = result.stdout.trim();
  assert.match(output, /^name\s+maxq-dev$/m);
  assert.match(output, new RegExp(`^version\\s+${pkg.version}$`, "m"));
  assert.match(output, /^description\s+CLI tooling for MAX-Q00$/m);
  assert.match(output, /^node\s+v\d+\.\d+\.\d+/m);
  assert.match(output, new RegExp(`^platform\\s+${process.platform}$`, "m"));
  assert.match(output, new RegExp(`^arch\\s+${process.arch}$`, "m"));
  assert.match(output, /^cwd\s+\S+/m);
  assert.match(output, /^scripts\s+.*\bbuild\b.*\btest\b/m);
});

test("doctor passes on this workspace", () => {
  const result = runCli("doctor");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /^PASS\s+node\s+/m);
  assert.match(result.stdout, /^PASS\s+package\s+/m);
  assert.match(result.stdout, /^PASS\s+bin\s+/m);
  assert.match(result.stdout, /^PASS\s+dist\s+/m);
  assert.match(result.stdout, /^PASS\s+smoke\s+/m);
  assert.match(result.stdout, /All 5 checks passed/);
});

test("doctor node check fails when engines.node is missing", () => {
  const result = checkNodeEngine("v22.14.0", undefined);
  assert.equal(result.ok, false);
  assert.match(result.reason, /engines\.node is missing/);
});

test("doctor node check fails on too-old Node", () => {
  const result = checkNodeEngine("v18.20.0", ">=22.12.0");
  assert.equal(result.ok, false);
  assert.match(result.reason, /does not satisfy/);
});

test("doctor package check requires name, version, and bin", () => {
  const result = checkPackageFields({ name: "x", version: "1.0.0" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /bin/);
});

test("check --help describes the quality gate", () => {
  const result = runCli("check", "--help");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Build then test/);
});

test("new command --help describes scaffolding", () => {
  const result = runCli("new", "command", "--help");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Add a new Commander command module/);
  assert.match(result.stdout, /<name>/);
});

test("new command rejects an invalid name", () => {
  const result = runCli("new", "command", "1bad");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must start with a letter/);
});

test("new command rejects an existing command file", () => {
  const result = runCli("new", "command", "hello");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /already exists/);
});

test("new command rejects a reserved name", () => {
  const result = runCli("new", "command", "version");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /reserved/);
});

test("validateCommandName accepts kebab and camel names", () => {
  assert.deepEqual(validateCommandName("foo-bar"), {
    kebab: "foo-bar",
    camel: "fooBar",
  });
  assert.deepEqual(validateCommandName("fooBar"), {
    kebab: "foo-bar",
    camel: "fooBar",
  });
  assert.throws(() => validateCommandName("foo bar"), /letters, digits/);
});

test("new command scaffolds into a temp project", () => {
  const root = mkdtempSync(path.join(tmpdir(), "maxq-new-command-"));
  try {
    mkdirSync(path.join(root, "src/commands"), { recursive: true });
    writeFileSync(
      path.join(root, "src/program.ts"),
      `import { Command } from "commander";
import { helloMessage } from "./commands/hello.js";
// maxq-dev:imports

export function createProgram(): Command {
  const program = new Command();
  program.command("hello").action(() => console.log(helloMessage()));
  // maxq-dev:commands
  return program;
}
`,
      "utf8",
    );
    writeFileSync(
      path.join(root, "README.md"),
      `# fixture

| Command | What it does |
| --- | --- |
| \`hello\` | Print a greeting |
<!-- maxq-dev:command-table-end -->
`,
      "utf8",
    );

    const result = runNewCommand("fooBar", { rootDir: root });
    assert.equal(result.ok, true, result.ok ? result.output : result.error);

    const modulePath = path.join(root, "src/commands/foo-bar.ts");
    const moduleSrc = readFileSync(modulePath, "utf8");
    assert.equal(moduleSrc, commandModuleSource({ kebab: "foo-bar", camel: "fooBar" }));
    assert.match(moduleSrc, /foo-bar command ran/);

    const programSrc = readFileSync(path.join(root, "src/program.ts"), "utf8");
    assert.match(
      programSrc,
      /import \{ fooBarMessage \} from "\.\/commands\/foo-bar\.js";/,
    );
    assert.match(programSrc, /\.command\("foo-bar"\)/);
    assert.match(programSrc, /fooBarMessage\(\)/);
    assert.match(programSrc, /\/\/ maxq-dev:imports/);
    assert.match(programSrc, /\/\/ maxq-dev:commands/);

    const readmeSrc = readFileSync(path.join(root, "README.md"), "utf8");
    assert.match(readmeSrc, /`foo-bar`/);
    assert.match(readmeSrc, /Stub for the foo-bar command/);

    const again = runNewCommand("foo-bar", { rootDir: root });
    assert.equal(again.ok, false);
    assert.match(again.error, /already exists/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("program and README patches keep markers", () => {
  const program = patchProgram(
    `import { helloMessage } from "./commands/hello.js";
// maxq-dev:imports

  // maxq-dev:commands
`,
    { kebab: "status", camel: "status" },
  );
  assert.match(program, /statusMessage/);
  assert.match(program, /\/\/ maxq-dev:imports/);
  assert.match(program, /\/\/ maxq-dev:commands/);

  const readme = patchReadme(
    `| \`hello\` | Print a greeting |\n<!-- maxq-dev:command-table-end -->\n`,
    { kebab: "status", camel: "status" },
  );
  assert.match(readme, /`status`/);
  assert.match(readme, /<!-- maxq-dev:command-table-end -->/);
});

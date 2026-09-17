# maxq-dev

Lab bench for this repo: a TypeScript + Commander CLI used to inspect, validate, and grow **maxq-dev** itself.

Keep using `hello` and `version` as smoke commands. Reach for `info`, `doctor`, and `check` when you want a snapshot, a health report, or a one-shot quality gate. Use `new command` when you add another Commander command.

## Requirements

- Node.js 22.12+ (`package.json` `engines.node`)
- npm

## Install

```bash
npm install
```

This also compiles `src/` to `dist/` via the `prepare` script.

## Build

```bash
npm run build
```

Rebuild after changing TypeScript sources.

## Run

After a build, any of these work:

```bash
npx maxq-dev hello
node dist/index.js hello
npm start -- hello
```

```text
Hello from maxq-dev v0.1.0
```

Help:

```bash
npx maxq-dev --help
```

## Commands

| Command | What it does |
| --- | --- |
| `hello` | Print a greeting and the package version |
| `version` | Print the package version (`--version` / `-v` also work) |
| `info` | Project and runtime snapshot |
| `doctor` | Workspace health checks (exit 0 only if all pass) |
| `check` | Build then test (quality gate) |
| `new command <name>` | Scaffold a new Commander command module |
<!-- maxq-dev:command-table-end -->

### hello

```bash
npx maxq-dev hello
```

```text
Hello from maxq-dev v0.1.0
```

### version

```bash
npx maxq-dev version
npx maxq-dev --version
npx maxq-dev -v
```

```text
0.1.0
```

### info

Print a concise, line-oriented snapshot of the package and runtime. One `key  value` pair per line.

```bash
npx maxq-dev info
```

```text
name         maxq-dev
version      0.1.0
description  CLI tooling for MAX-Q00
node         v22.14.0
platform     linux
arch         x64
cwd          /path/to/Dev
scripts      build, prepare, start, dev, test
```

### doctor

Run health checks and exit `0` only when every check passes. Failures print as `FAIL` with an actionable reason.

Checks:

- Node satisfies `engines.node` in `package.json` (`>=22.12.0`)
- `package.json` has `name`, `version`, and `bin` (`main` / `types` when present)
- Package `bin` paths exist on disk
- `dist/` build artifacts exist (run `npm run build` if they do not)
- Smoke: compiled program and bin load (`--help` exits 0)

```bash
npx maxq-dev doctor
```

```text
doctor  maxq-dev

PASS  node     Node v22.14.0 satisfies engines.node >=22.12.0
PASS  package  package.json has name, version, bin, main
PASS  bin      bin resolves (bin/maxq-dev.js)
PASS  dist     dist/index.js, dist/program.js exist
PASS  smoke    program loads (dist/index.js and bin --help exited 0)

All 5 checks passed
```

### check

One-shot quality gate: `npm run build` then `npm test`. Streams npm output. Exits non-zero if either script fails.

`npm test` already rebuilds, so this runs compile twice. That is intentional — `check` is the "is this repo green?" command and uses the existing package scripts as-is.

```bash
npx maxq-dev check
```

Do not spawn `check` from inside `npm test`; it would recurse.

### new command

Scaffold a command module under `src/commands/<name>.ts`, wire it in `src/program.ts`, and add a row to the command table above.

Names may be kebab-case or camelCase (`status`, `foo-bar`, `fooBar`). Invalid identifiers and existing command files fail with a clear error.

```bash
npx maxq-dev new command status
npm run build
npx maxq-dev status
```

```text
status command ran
```

After scaffolding, rebuild so `dist/` picks up the new module.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start -- <cmd>` | Run the compiled CLI |
| `npm run dev -- <cmd>` | Rebuild, then run the CLI |
| `npm test` | Build, then run the CLI tests |

## Layout

```text
src/
  index.ts                 CLI implementation entry
  program.ts               Commander program
  config.ts                Package.json + project root
  node-engine.ts           engines.node range check
  commands/hello.ts        hello command
  commands/info.ts         info command
  commands/doctor.ts       doctor command
  commands/check.ts        check command
  commands/new-command.ts  new command scaffolder
bin/
  maxq-dev.js              Package bin (npx / npm)
test/
  cli.test.js              Spawns the compiled CLI
```

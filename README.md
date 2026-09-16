# maxq-dev

CLI tooling for MAX-Q00. TypeScript + Node.js, wired so a local `npx` / package bin script runs the CLI.

## Requirements

- Node.js 22.12+
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

First command:

```text
Hello from maxq-dev v0.1.0
```

Version:

```bash
npx maxq-dev version
npx maxq-dev --version
npx maxq-dev -v
```

```text
0.1.0
```

Help:

```bash
npx maxq-dev --help
```

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
  index.ts           CLI implementation entry
  program.ts         Commander program
  config.ts          Package name + version
  commands/hello.ts  hello command
bin/
  maxq-dev.js        Package bin (npx / npm)
test/
  cli.test.js        Spawns the compiled CLI
```

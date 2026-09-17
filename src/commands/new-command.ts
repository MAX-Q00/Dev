import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getRootDir } from "../config.js";

const IMPORTS_MARKER = "// maxq-dev:imports";
const COMMANDS_MARKER = "// maxq-dev:commands";
const README_TABLE_MARKER = "<!-- maxq-dev:command-table-end -->";

const RESERVED_COMMANDS = new Set([
  "help",
  "new",
  "version",
  "command",
]);

export type ValidatedName = {
  kebab: string;
  camel: string;
};

export type NewCommandResult =
  | { ok: true; output: string }
  | { ok: false; error: string };

export function validateCommandName(raw: string): ValidatedName {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Command name is required");
  }
  if (trimmed.length > 64) {
    throw new Error("Command name is too long (max 64 characters)");
  }
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(trimmed)) {
    throw new Error(
      "Command name must start with a letter and contain only letters, digits, hyphens, or underscores",
    );
  }
  if (/--|__|_-|-_/.test(trimmed)) {
    throw new Error("Command name cannot contain consecutive separators");
  }

  const kebab = toKebab(trimmed);
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(kebab)) {
    throw new Error(`Command name is not a valid CLI identifier: ${raw}`);
  }

  return { kebab, camel: toCamel(kebab) };
}

export function runNewCommand(
  rawName: string,
  options: { rootDir?: string } = {},
): NewCommandResult {
  let name: ValidatedName;
  try {
    name = validateCommandName(rawName);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const rootDir = options.rootDir ?? getRootDir();
  const commandFile = join(rootDir, "src/commands", `${name.kebab}.ts`);
  const programFile = join(rootDir, "src/program.ts");
  const readmeFile = join(rootDir, "README.md");

  if (existsSync(commandFile)) {
    return {
      ok: false,
      error: `Command file already exists: src/commands/${name.kebab}.ts`,
    };
  }

  if (RESERVED_COMMANDS.has(name.kebab)) {
    return {
      ok: false,
      error: `Command name '${name.kebab}' is reserved`,
    };
  }

  if (!existsSync(programFile)) {
    return { ok: false, error: "src/program.ts not found" };
  }
  if (!existsSync(readmeFile)) {
    return { ok: false, error: "README.md not found" };
  }

  const programSrc = readFileSync(programFile, "utf8");
  if (hasRegisteredCommand(programSrc, name.kebab)) {
    return {
      ok: false,
      error: `Command '${name.kebab}' is already registered in src/program.ts`,
    };
  }

  let nextProgram: string;
  let nextReadme: string;
  try {
    nextProgram = patchProgram(programSrc, name);
    nextReadme = patchReadme(readFileSync(readmeFile, "utf8"), name);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  writeFileSync(commandFile, commandModuleSource(name), "utf8");
  writeFileSync(programFile, nextProgram, "utf8");
  writeFileSync(readmeFile, nextReadme, "utf8");

  return {
    ok: true,
    output: [
      `Created src/commands/${name.kebab}.ts`,
      `Registered ${name.kebab} in src/program.ts`,
      "Updated README.md command list",
      "",
      "Rebuild to run it:",
      "  npm run build",
      `  npx maxq-dev ${name.kebab}`,
    ].join("\n"),
  };
}

export function commandModuleSource(name: ValidatedName): string {
  return `export function ${name.camel}Message(): string {
  return "${name.kebab} command ran";
}
`;
}

export function patchProgram(source: string, name: ValidatedName): string {
  if (!source.includes(IMPORTS_MARKER)) {
    throw new Error(`src/program.ts is missing marker: ${IMPORTS_MARKER}`);
  }
  if (!source.includes(COMMANDS_MARKER)) {
    throw new Error(`src/program.ts is missing marker: ${COMMANDS_MARKER}`);
  }

  const importLine = `import { ${name.camel}Message } from "./commands/${name.kebab}.js";\n`;
  const commandBlock = `
  program
    .command("${name.kebab}")
    .description("Stub for the ${name.kebab} command")
    .action(() => {
      console.log(${name.camel}Message());
    });

`;

  return source
    .replace(IMPORTS_MARKER, `${importLine}${IMPORTS_MARKER}`)
    .replace(COMMANDS_MARKER, `${commandBlock}  ${COMMANDS_MARKER}`);
}

export function patchReadme(source: string, name: ValidatedName): string {
  if (!source.includes(README_TABLE_MARKER)) {
    throw new Error(`README.md is missing marker: ${README_TABLE_MARKER}`);
  }

  const row = `| \`${name.kebab}\` | Stub for the ${name.kebab} command |\n`;
  return source.replace(README_TABLE_MARKER, `${row}${README_TABLE_MARKER}`);
}

function hasRegisteredCommand(programSrc: string, kebab: string): boolean {
  const pattern = new RegExp(
    String.raw`\.command\(\s*["']${escapeRegExp(kebab)}["']\s*\)`,
  );
  return pattern.test(programSrc);
}

function toKebab(name: string): string {
  return name
    .replace(/_/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function toCamel(kebab: string): string {
  return kebab.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

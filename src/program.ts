import { Command } from "commander";
import { getConfig } from "./config.js";
import { helloMessage } from "./commands/hello.js";
import { formatInfo } from "./commands/info.js";
import { runDoctor } from "./commands/doctor.js";
import { runCheck } from "./commands/check.js";
import { runNewCommand } from "./commands/new-command.js";
// maxq-dev:imports

export function createProgram(): Command {
  const config = getConfig();
  const program = new Command();

  program
    .name(config.name)
    .description(
      "Lab bench for the maxq-dev CLI — inspect, validate, and grow the tool itself",
    )
    .version(config.version, "-v, --version");

  program
    .command("hello")
    .description("Print a greeting and the package version")
    .action(() => {
      console.log(helloMessage(config.name, config.version));
    });

  program
    .command("version")
    .description("Print the package version")
    .action(() => {
      console.log(config.version);
    });

  program
    .command("info")
    .description("Print a project and runtime snapshot")
    .action(() => {
      console.log(formatInfo());
    });

  program
    .command("doctor")
    .description("Run workspace health checks")
    .action(() => {
      const result = runDoctor();
      console.log(result.output);
      if (!result.ok) {
        process.exitCode = 1;
      }
    });

  program
    .command("check")
    .description("Build then test (quality gate)")
    .action(() => {
      const code = runCheck();
      if (code !== 0) {
        process.exit(code);
      }
    });

  const newCmd = program
    .command("new")
    .description("Scaffold new CLI pieces");

  newCmd
    .command("command <name>")
    .description("Add a new Commander command module")
    .action((name: string) => {
      const result = runNewCommand(name);
      if (!result.ok) {
        console.error(result.error);
        process.exitCode = 1;
        return;
      }
      console.log(result.output);
    });

  // maxq-dev:commands

  return program;
}

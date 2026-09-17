import { Command } from "commander";
import { getConfig } from "./config.js";
import { helloMessage } from "./commands/hello.js";

export function createProgram(): Command {
  const config = getConfig();
  const program = new Command();

  program
    .name(config.name)
    .description("CLI tooling for MAX-Q00")
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

  return program;
}

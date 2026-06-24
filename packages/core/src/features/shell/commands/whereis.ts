import { Command } from "../command";
import { ExecutableResolver } from "../executableResolver";
import { Shell } from "../shell";
import { VirtualFile } from "../../virtual-drive/file";

export const whereis = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Locate the binary for a command",
		usage: "whereis COMMAND...",
		description: "Display locations for each COMMAND.",
	})
	.setExecute(async function(args, { stdout, env, workingDirectory }) {
		for (const commandName of args) {
			const matches: string[] = [];
			const builtinName = commandName.toLowerCase();

			if (ExecutableResolver.getBuiltin(builtinName))
				matches.push(builtinName);

			const resolved = await ExecutableResolver.resolve(commandName, env, workingDirectory);
			if (resolved.isOk()) {
				if (resolved.value instanceof VirtualFile) {
					matches.push(resolved.value.absolutePath);
				} else if (!matches.includes(resolved.value.name)) {
					matches.push(resolved.value.name);
				}
			}

			const suffix = matches.length ? ` ${matches.join(" ")}` : "";
			await Shell.printLn(stdout, `${commandName}:${suffix}`);
		}
	});

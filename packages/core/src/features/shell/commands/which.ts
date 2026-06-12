import { Shell } from "../shell";
import { Command } from "../command";
import { ExecutableResolver } from "../executableResolver";
import { VirtualFile } from "../../virtual-drive/file";

export const which = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Locate a command",
		usage: "which COMMAND",
		description: "Print the path or builtin name that would be executed for COMMAND.",
	})
	.setExecute(async function(this: Command, args, { stdout, stderr, env, workingDirectory }) {
		const commandName = args[0];
		const builtinName = commandName.toLowerCase();

		const builtin = ExecutableResolver.getBuiltin(builtinName);
		if (builtin) {
			await Shell.printLn(stdout, builtinName);
			return;
		}

		const resolved = await ExecutableResolver.resolve(commandName, env, workingDirectory);
		if (resolved.isError())
			return Shell.writeError(stderr, this.name, `${commandName}: Command not found`);

		if (resolved.value instanceof VirtualFile)
			return Shell.printLn(stdout, resolved.value.absolutePath);

		await Shell.printLn(stdout, resolved.value.name);
	});

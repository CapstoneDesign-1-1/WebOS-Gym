import { EXIT_CODE } from "../../../constants";
import { Command } from "../command";
import { Shell } from "../shell";

export const pkill = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Signal processes by name",
		usage: "pkill PATTERN",
		description: "Send a signal to processes matching PATTERN.",
	})
	.setExecute(async function(this: Command, args, { stderr }) {
		const pattern = args[0];
		const knownNames = ["init", "shell"];
		const hasMatch = knownNames.some((name) => name.includes(pattern));

		if (!hasMatch)
			return Shell.writeError(stderr, this.name, `${pattern}: no process found`, EXIT_CODE.generalError);
	});

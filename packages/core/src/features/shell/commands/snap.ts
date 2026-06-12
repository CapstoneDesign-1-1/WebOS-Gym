import { Command } from "../command";
import { Shell } from "../shell";

export const snap = new Command()
	.setManual({
		purpose: "Tool to interact with snap packages",
		usage: "snap list",
		description: "Display installed snap packages.",
	})
	.setExecute(async function(this: Command, args, { stdout, stderr }) {
		const subcommand = args[0];

		if (subcommand !== "list")
			return Shell.writeError(stderr, this.name, Shell.USAGE_ERROR);

		await Shell.printLn(stdout, "Name Version Rev Tracking Publisher Notes");
		await Shell.printLn(stdout, "prozilla-os 1.0 1 stable prozilla -");
		await Shell.printLn(stdout, "core22 2026.01 1 stable canonical* base");
	});

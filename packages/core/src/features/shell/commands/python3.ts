import { Command } from "../command";
import { Shell } from "../shell";

export const python3 = new Command()
	.setManual({
		purpose: "Run the Python interpreter",
		usage: "python3 --version",
		description: "Display Python 3 version information.",
	})
	.setExecute(async function(this: Command, args, { stdout, stderr }) {
		if (!args.length || args[0] === "--version" || args[0] === "-V") {
			await Shell.printLn(stdout, "Python 3.12.4");
			return;
		}

		return Shell.writeError(stderr, this.name, Shell.USAGE_ERROR);
	});

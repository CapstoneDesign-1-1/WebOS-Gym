import { EXIT_CODE } from "../../../constants";
import { Command } from "../command";
import { Shell } from "../shell";

export const chown = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Change file owner and group",
		usage: "chown OWNER[:GROUP] FILE...",
		description: "Change the owner and/or group of each FILE.",
	})
	.setExecute(async function(this: Command, args, { workingDirectory, stderr }) {
		if (args.length < 2)
			return Shell.writeError(stderr, this.name, Shell.USAGE_ERROR);

		const [, ...paths] = args;
		let exitCode: number = EXIT_CODE.success;

		for (const path of paths) {
			const target = workingDirectory.navigate(path);
			if (!target)
				exitCode = await Shell.writeError(stderr, this.name, `${path}: ${Shell.INVALID_PATH_ERROR}`);
		}

		return exitCode;
	});

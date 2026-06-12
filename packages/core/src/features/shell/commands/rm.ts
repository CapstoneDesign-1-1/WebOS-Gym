import { EXIT_CODE } from "../../../constants";
import { Shell } from "../shell";
import { Command } from "../command";

export const rm = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Remove a file",
	})
	.setExecute(async function(this: Command, args, { workingDirectory, stderr }) {
		let exitCode: number = EXIT_CODE.success;

		for (const path of args) {
			const target = workingDirectory.navigate(path);

			if (!target) {
				exitCode = await Shell.writeError(stderr, this.name, `${path}: No such file`);
				continue;
			}

			if (target.isFolder()) {
				exitCode = await Shell.writeError(stderr, this.name, `${path}: Is a directory`);
				continue;
			}

			target.delete();
		}

		return exitCode;
	});

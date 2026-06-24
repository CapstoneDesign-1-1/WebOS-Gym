import { EXIT_CODE } from "../../../constants";
import { Shell } from "../shell";
import { Command } from "../command";

export const rmdir = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Remove a directory",
	})
	.setExecute(async function(this: Command, args, { workingDirectory, stderr }) {
		let exitCode = EXIT_CODE.success;

		for (const folderPath of args) {
			const target = workingDirectory.navigate(folderPath);

			if (!target) {
				exitCode = await Shell.writeError(stderr, this.name, `${folderPath}: No such directory`);
				continue;
			}

			if (target.isFile()) {
				exitCode = await Shell.writeError(stderr, this.name, `${folderPath}: Not a directory`);
				continue;
			}

			target.delete();
		}

		return exitCode;
	});

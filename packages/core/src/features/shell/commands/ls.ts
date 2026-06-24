import { VirtualFolder } from "../../virtual-drive";
import { Shell } from "../shell";
import { Command } from "../command";
import { ANSI } from "@prozilla-os/shared";

export const ls = new Command()
	.setManual({
		purpose: "List directory contents",
		usage: "ls [options] [files]",
		description: "List information about directories or files (the current directory by default).",
	})
	.setExecute(async function(this: Command, args, { workingDirectory, stdout, stderr }) {
		const listDirectory = (directory: VirtualFolder) => {
			const folderNames = directory.subFolders.map((folder) => `${ANSI.fg.blue}${folder.id}${ANSI.reset}`);
			const fileNames = directory.files.map((file) => file.id);
			return folderNames.concat(fileNames).sort();
		};

		if (args.length === 0) {
			const contents = listDirectory(workingDirectory);
			if (contents.length)
				await Shell.printLn(stdout, contents.join("  "));
			return;
		}

		const output: string[] = [];

		for (const path of args) {
			const target = workingDirectory.navigate(path);
			if (target == null) {
				await Shell.writeError(stderr, this.name, `Cannot access '${path}': No such file or directory`);
				continue;
			}

			if (target.isFolder()) {
				output.push(...listDirectory(target));
			} else if (target.isFile()) {
				output.push(target.id);
			}
		}

		if (output.length)
			await Shell.printLn(stdout, output.join("  "));
	});

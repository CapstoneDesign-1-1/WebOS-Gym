import { VirtualFile, VirtualFolder } from "../../virtual-drive";
import { EXIT_CODE } from "../../../constants";
import { Command } from "../command";
import { Shell } from "../shell";

function toBytes(value: string | null | undefined): number {
	if (value == null)
		return 0;
	return new TextEncoder().encode(value).length;
}

function fileSize(file: VirtualFile): number {
	if (file.content != null)
		return toBytes(file.content);
	if (file.source != null)
		return toBytes(file.source);
	return 0;
}

function folderSize(folder: VirtualFolder): number {
	let sum = 0;

	for (const file of folder.getFiles(true))
		sum += fileSize(file);

	for (const subFolder of folder.getSubFolders(true))
		sum += folderSize(subFolder);

	return sum;
}

export const du = new Command()
	.setManual({
		purpose: "Estimate file space usage",
		usage: "du [OPTION]... [FILE]...",
		description: "Summarize device usage for each FILE recursively.",
		options: {
			"-s": "Display only a total for each argument",
			"-a": "Write counts for all files, not just directories",
		},
	})
	.addOption({ short: "s", long: "summarize" })
	.addOption({ short: "a", long: "all" })
	.setExecute(async function(this: Command, args, { workingDirectory, stdout, stderr, options }) {
		const paths = args.length ? args : ["."];
		const summarize = options.includes("s");
		const showAllFiles = options.includes("a") && !summarize;
		let hadError = false;

		const printForFolder = async (folder: VirtualFolder, label: string) => {
			if (!summarize) {
				for (const subFolder of folder.getSubFolders(true)) {
					await printForFolder(subFolder, subFolder.absolutePath);
				}
				if (showAllFiles) {
					for (const file of folder.getFiles(true))
						await Shell.printLn(stdout, `${fileSize(file)}\t${file.absolutePath}`);
				}
			}

			await Shell.printLn(stdout, `${folderSize(folder)}\t${label}`);
		};

		for (const path of paths) {
			const target = workingDirectory.navigate(path);
			if (!target) {
				hadError = true;
				await Shell.writeError(stderr, this.name, `${path}: ${Shell.INVALID_PATH_ERROR}`);
				continue;
			}

			if (target.isFile()) {
				await Shell.printLn(stdout, `${fileSize(target)}\t${target.absolutePath}`);
				continue;
			}

			await printForFolder(target, target.absolutePath);
		}

		if (hadError)
			return EXIT_CODE.generalError;
	});

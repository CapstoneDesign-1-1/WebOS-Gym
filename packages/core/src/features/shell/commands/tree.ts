import { parseOptionalInteger } from "@prozilla-os/shared";
import { Command } from "../command";
import { Shell } from "../shell";
import { VirtualFile, VirtualFolder } from "../../virtual-drive";

type TreeStats = {
	folders: number;
	files: number;
};

function compareById(a: VirtualFile | VirtualFolder, b: VirtualFile | VirtualFolder) {
	return a.id.localeCompare(b.id);
}

function buildTreeLines(folder: VirtualFolder, showHidden: boolean, maxDepth: number, stats: TreeStats): string[] {
	const lines: string[] = [];

	const walk = (current: VirtualFolder, prefix: string, depth: number) => {
		if (depth >= maxDepth)
			return;

		const children = [
			...current.getSubFolders(showHidden),
			...current.getFiles(showHidden),
		].sort(compareById);

		children.forEach((child, index) => {
			const isLast = index === children.length - 1;
			const connector = isLast ? "`-- " : "|-- ";
			lines.push(`${prefix}${connector}${child.id}`);

			if (child.isFolder()) {
				stats.folders++;
				const nextPrefix = prefix + (isLast ? "    " : "|   ");
				walk(child, nextPrefix, depth + 1);
			} else {
				stats.files++;
			}
		});
	};

	walk(folder, "", 0);
	return lines;
}

export const tree = new Command()
	.setManual({
		purpose: "Display directory structure as a tree",
		usage: "tree [OPTION]... [PATH]",
		description: "List files and directories in a tree-like format.",
		options: {
			"-a": "Show hidden files and directories",
			"-L LEVEL": "Descend only LEVEL directories deep",
		},
	})
	.addOption({ short: "a", long: "all" })
	.addOption({ short: "L", long: "level", isInput: true })
	.setExecute(async function(this: Command, args, { workingDirectory, stdout, stderr, options, inputs }) {
		const startPath = args[0] ?? ".";
		const start = workingDirectory.navigate(startPath);

		if (!start)
			return Shell.writeError(stderr, this.name, `${startPath}: No such file or directory`);

		const showHidden = options.includes("a");
		const parsedLevel = parseOptionalInteger(inputs.L, Number.MAX_SAFE_INTEGER);
		const maxDepth = Math.max(0, parsedLevel);

		if (start.isFile()) {
			await Shell.printLn(stdout, start.id);
			await Shell.printLn(stdout, "");
			await Shell.printLn(stdout, "0 directories, 1 file");
			return;
		}

		const stats: TreeStats = { folders: 0, files: 0 };
		const lines = buildTreeLines(start, showHidden, maxDepth, stats);

		await Shell.printLn(stdout, start.id);
		if (lines.length)
			await Shell.printLn(stdout, lines.join("\n"));
		await Shell.printLn(stdout, "");
		await Shell.printLn(stdout, `${stats.folders} director${stats.folders === 1 ? "y" : "ies"}, ${stats.files} file${stats.files === 1 ? "" : "s"}`);
	});

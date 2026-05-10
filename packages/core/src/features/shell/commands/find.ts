import { VirtualFile, VirtualFolder } from "../../virtual-drive";
import { Shell } from "../shell";
import { Command } from "../command";

export const find = new Command()
	.setManual({
		purpose: "Search for files and directories",
		usage: "find [PATH]",
		description: "Print files and directories under PATH recursively (the current directory by default).",
	})
	.setExecute(async function(this: Command, args, { workingDirectory, virtualRoot, stdout, stderr }) {
		const startPath = args[0] ?? ".";
		const start = resolvePath(virtualRoot, workingDirectory.absolutePath, startPath);

		if (!start)
			return Shell.writeError(stderr, this.name, `${startPath}: No such file or directory`);

		for (const path of walk(start)) {
			await Shell.printLn(stdout, path);
		}
	});

function* walk(node: VirtualFile | VirtualFolder): Generator<string> {
	yield node.absolutePath;

	if (!node.isFolder())
		return;

	const folders = [...node.getSubFolders(true)].sort((a, b) => a.id.localeCompare(b.id));
	const files = [...node.getFiles(true)].sort((a, b) => a.id.localeCompare(b.id));

	for (const folder of folders)
		yield* walk(folder);

	for (const file of files)
		yield file.absolutePath;
}

function resolvePath(virtualRoot: VirtualFolder, currentPath: string, path: string): VirtualFile | VirtualFolder | null {
	if (path === ".")
		return virtualRoot.navigate(currentPath);

	if (path === "..") {
		const segments = currentPath.split("/").filter(Boolean);
		const parentPath = segments.length > 1 ? `/${segments.slice(0, -1).join("/")}` : "/";
		return virtualRoot.navigate(parentPath);
	}

	const absolutePath = path.startsWith("/") || path.startsWith("~")
		? path
		: `${currentPath}/${path}`;

	return virtualRoot.navigate(absolutePath);
}

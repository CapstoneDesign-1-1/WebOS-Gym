import { VirtualFile, VirtualFolder } from "../../virtual-drive";
import { Shell } from "../shell";
import { Command } from "../command";

export const mv = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Move or rename files and directories",
		usage: "mv SOURCE DEST",
		description: "Move SOURCE to DEST, or rename SOURCE when DEST does not already exist as a directory.",
	})
	.setExecute(function(this: Command, args, { workingDirectory, virtualRoot, stderr }) {
		const [sourcePath, destPath] = args;

		if (!sourcePath || !destPath)
			return Shell.writeError(stderr, this.name, Shell.USAGE_ERROR);

		const source = resolvePath(virtualRoot, workingDirectory.absolutePath, sourcePath);
		if (!source)
			return Shell.writeError(stderr, this.name, `${sourcePath}: No such file or directory`);

		if (!source.canBeEdited)
			return Shell.writeError(stderr, this.name, `${sourcePath}: Permission denied`);

		const existingDestination = resolvePath(virtualRoot, workingDirectory.absolutePath, destPath);
		let destinationDirectory: VirtualFolder | null = null;
		let destinationName = source.id;

		if (existingDestination?.isFolder()) {
			destinationDirectory = existingDestination;
		} else {
			const { parentPath, name } = splitDestinationPath(destPath);
			destinationDirectory = parentPath === "."
				? resolvePath(virtualRoot, workingDirectory.absolutePath, workingDirectory.absolutePath)
				: resolvePath(virtualRoot, workingDirectory.absolutePath, parentPath);
			if (destinationDirectory?.isFile())
				destinationDirectory = null;
			destinationName = name;
		}

		if (!destinationDirectory)
			return Shell.writeError(stderr, this.name, `${destPath}: No such file or directory`);

		if (!destinationDirectory.canBeEdited)
			return Shell.writeError(stderr, this.name, `${destPath}: Permission denied`);

		if (source.isFolder() && isDescendantPath(destinationDirectory, source))
			return Shell.writeError(stderr, this.name, `${destPath}: Invalid destination`);

		const { name: destinationBaseName, extension: destinationExtension } = VirtualFile.splitId(destinationName);

		if (source.isFile()) {
			const conflictingFile = destinationDirectory.findFile(destinationBaseName, destinationExtension);
			if (conflictingFile && conflictingFile !== source)
				return Shell.writeError(stderr, this.name, `${destPath}: File exists`);

			if (destinationDirectory.findSubFolder(destinationName))
				return Shell.writeError(stderr, this.name, `${destPath}: File exists`);
		} else {
			if (destinationDirectory.findSubFolder(destinationName) && destinationDirectory.findSubFolder(destinationName) !== source)
				return Shell.writeError(stderr, this.name, `${destPath}: File exists`);

			if (destinationDirectory.findFile(destinationBaseName, destinationExtension))
				return Shell.writeError(stderr, this.name, `${destPath}: File exists`);
		}

		if (source.parent === destinationDirectory && source.id === destinationName)
			return;

		const sourceParent = source.parent;
		if (!sourceParent)
			return Shell.writeError(stderr, this.name, `${sourcePath}: Invalid path`);

		detach(sourceParent, source);

		if (source.isFile()) {
			source.name = destinationBaseName;
			source.extension = destinationExtension;
			destinationDirectory.files.push(source);
		} else {
			source.name = destinationName;
			destinationDirectory.subFolders.push(source);
		}

		source.parent = destinationDirectory;
		source.editedByUser = true;
		destinationDirectory.editedByUser = true;
		sourceParent.editedByUser = true;
		virtualRoot.saveData();
	});

function splitDestinationPath(path: string): { parentPath: string; name: string } {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex === -1)
		return { parentPath: ".", name: path };

	return {
		parentPath: path.slice(0, lastSlashIndex) || "/",
		name: path.slice(lastSlashIndex + 1),
	};
}

function isDescendantPath(target: VirtualFolder, source: VirtualFolder): boolean {
	const sourcePath = source.absolutePath;
	const targetPath = target.absolutePath;

	return targetPath === sourcePath || targetPath.startsWith(sourcePath + "/");
}

function detach(parent: VirtualFolder, child: VirtualFile | VirtualFolder): void {
	const childPath = child.absolutePath;
	const childId = child.id;

	if (child.isFile()) {
		parent.files = parent.files.filter((file) => file !== child && file.absolutePath !== childPath && file.id !== childId);
	} else {
		parent.subFolders = parent.subFolders.filter((folder) => folder !== child && folder.absolutePath !== childPath && folder.id !== childId);
	}
}

function resolvePath(virtualRoot: VirtualFolder, currentPath: string, path: string): VirtualFile | VirtualFolder | null {
	const absolutePath = path.startsWith("/") || path.startsWith("~")
		? path
		: `${currentPath}/${path}`;

	return virtualRoot.navigate(absolutePath);
}

import { VirtualFile, VirtualFolder } from "../../virtual-drive";
import { Shell } from "../shell";
import { Command } from "../command";

export const cp = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Copy files",
		usage: "cp SOURCE DEST",
		description: "Copy SOURCE to DEST, or into DEST when DEST is an existing directory.",
	})
	.setExecute(function(this: Command, args, { workingDirectory, virtualRoot, stderr }) {
		const [sourcePath, destPath] = args;

		if (!sourcePath || !destPath)
			return Shell.writeError(stderr, this.name, Shell.USAGE_ERROR);

		const source = resolvePath(virtualRoot, workingDirectory.absolutePath, sourcePath);
		if (!source)
			return Shell.writeError(stderr, this.name, `${sourcePath}: No such file or directory`);

		if (!source.isFile())
			return Shell.writeError(stderr, this.name, `${sourcePath}: Is a directory`);

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

		if (destinationDirectory.findSubFolder(destinationName))
			return Shell.writeError(stderr, this.name, `${destPath}: Is a directory`);

		const { name: destinationBaseName, extension: destinationExtension } = VirtualFile.splitId(destinationName);
		let destinationFile = destinationDirectory.findFile(destinationBaseName, destinationExtension);

		if (!destinationFile) {
			destinationDirectory.createFile(destinationBaseName, destinationExtension as string | undefined, (newFile) => {
				if (newFile.isFile())
					destinationFile = newFile;
			});
		}

		if (!destinationFile || !destinationFile.isFile())
			return Shell.writeError(stderr, this.name, `${destPath}: Invalid destination`);

		if (!destinationFile.canBeEdited)
			return Shell.writeError(stderr, this.name, `${destPath}: Permission denied`);

		destinationFile.name = destinationBaseName;
		destinationFile.extension = destinationExtension;
		destinationFile.content = source.content;
		destinationFile.source = source.source;
		destinationFile.iconUrl = source.iconUrl;
		destinationFile.editedByUser = true;
		destinationDirectory.editedByUser = true;
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

function resolvePath(virtualRoot: VirtualFolder, currentPath: string, path: string): VirtualFile | VirtualFolder | null {
	const absolutePath = path.startsWith("/") || path.startsWith("~")
		? path
		: `${currentPath}/${path}`;

	return virtualRoot.navigate(absolutePath);
}

import { VirtualFile } from "../../virtual-drive";
import { EXIT_CODE } from "../../../constants";
import { Command } from "../command";
import { Shell } from "../shell";

export const touch = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Change file timestamps",
		usage: "touch [options] files",
		description: "Update the access and modification times of each FILE to the current time.\n\n"
            + "A file argument that does not exist is created empty.",
	})
	.setExecute(async function(this: Command, args, { workingDirectory, stderr }) {
		let exitCode = EXIT_CODE.success;

		for (const filePath of args) {
			const existingTarget = workingDirectory.navigate(filePath);

			if (existingTarget != null) {
				if (existingTarget.isFolder()) {
					exitCode = await Shell.writeError(stderr, this.name, `${filePath}: Is a directory`);
				}
				continue;
			}

			const { parentPath, name } = splitDestinationPath(filePath);
			const parent = parentPath === "." ? workingDirectory : workingDirectory.navigate(parentPath);

			if (!parent || parent.isFile()) {
				exitCode = await Shell.writeError(stderr, this.name, `${filePath}: ${Shell.INVALID_PATH_ERROR}`);
				continue;
			}

			const { name: baseName, extension } = splitFileName(name);
			if (!baseName) {
				exitCode = await Shell.writeError(stderr, this.name, `${filePath}: Invalid path`);
				continue;
			}

			if (parent.findSubFolder(name)) {
				exitCode = await Shell.writeError(stderr, this.name, `${filePath}: Is a directory`);
				continue;
			}

			if (!parent.findFile(baseName, extension))
				parent.createFile(baseName, extension);
		}

		return exitCode;
	});

function splitDestinationPath(path: string): { parentPath: string; name: string } {
	const trimmed = path.replace(/\/+$/, "");
	const lastSlashIndex = trimmed.lastIndexOf("/");
	if (lastSlashIndex === -1)
		return { parentPath: ".", name: trimmed };

	return {
		parentPath: trimmed.slice(0, lastSlashIndex) || "/",
		name: trimmed.slice(lastSlashIndex + 1),
	};
}

function splitFileName(fileName: string): { name: string; extension: string | undefined } {
	if (fileName.startsWith(".") && !fileName.slice(1).includes("."))
		return { name: fileName, extension: undefined };

	const { name, extension } = VirtualFile.splitId(fileName);

	if (!name && fileName.startsWith("."))
		return { name: fileName, extension: undefined };

	return { name, extension: extension as string | undefined };
}

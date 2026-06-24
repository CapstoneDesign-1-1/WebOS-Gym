import { EXIT_CODE } from "../../../constants";
import { VirtualFile, VirtualFolder } from "../../virtual-drive";
import { Command } from "../command";
import { Shell } from "../shell";

type ArchiveEntry = {
	path: string;
	content: string | null;
	source: string | null;
};

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

function resolveParent(workingDirectory: VirtualFolder, parentPath: string): VirtualFolder | null {
	if (parentPath === ".")
		return workingDirectory;

	const parent = workingDirectory.navigate(parentPath);
	if (!parent || parent.isFile())
		return null;

	return parent;
}

export const zip = new Command()
	.setManual({
		purpose: "Package and compress files",
		usage: "zip ARCHIVE FILE...",
		description: "Create a zip archive containing the specified files.",
	})
	.setRequireArgs(true)
	.setExecute(async function(this: Command, args, { workingDirectory, stderr }) {
		if (args.length < 2)
			return Shell.writeError(stderr, this.name, Shell.USAGE_ERROR);

		const [archivePath, ...paths] = args;
		const entries: ArchiveEntry[] = [];
		let hadError = false;

		for (const path of paths) {
			const target = workingDirectory.navigate(path);
			if (!target) {
				hadError = true;
				await Shell.writeError(stderr, this.name, `${path}: ${Shell.INVALID_PATH_ERROR}`);
				continue;
			}

			if (target.isFolder()) {
				hadError = true;
				await Shell.writeError(stderr, this.name, `${path}: Is a directory`);
				continue;
			}

			entries.push({
				path,
				content: target.content ?? null,
				source: target.source ?? null,
			});
		}

		if (hadError)
			return EXIT_CODE.generalError;

		const archivePayload = JSON.stringify({ format: "prozilla-archive", type: "zip", entries });
		const { parentPath, name } = splitDestinationPath(archivePath);
		const parent = resolveParent(workingDirectory, parentPath);

		if (!parent)
			return Shell.writeError(stderr, this.name, `${archivePath}: ${Shell.INVALID_PATH_ERROR}`);

		if (parent.findSubFolder(name))
			return Shell.writeError(stderr, this.name, `${archivePath}: Is a directory`);

		const { name: baseName, extension } = VirtualFile.splitId(name);
		const normalizedExtension = extension ?? undefined;
		parent.createFile(baseName, normalizedExtension, (file) => {
			if (file.isFile())
				file.setContent(archivePayload);
		});
	});

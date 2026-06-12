import { EXIT_CODE } from "../../../constants";
import { VirtualFile, VirtualFolder } from "../../virtual-drive";
import { Command } from "../command";
import { Shell } from "../shell";

type ArchiveEntry = {
	path: string;
	content: string | null;
	source: string | null;
};

type ZipArchive = {
	format: string;
	type: string;
	entries: ArchiveEntry[];
};

function normalizePath(path: string): string {
	if (path === "/")
		return path;

	return path.replace(/\/+$/, "");
}

function splitPath(path: string): { parentPath: string; name: string } {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex === -1)
		return { parentPath: ".", name: path };

	return {
		parentPath: path.slice(0, lastSlashIndex) || "/",
		name: path.slice(lastSlashIndex + 1),
	};
}

function ensureDirectoryPath(workingDirectory: VirtualFolder, rawPath: string): VirtualFolder | null {
	const path = normalizePath(rawPath);
	if (!path)
		return null;

	let current: VirtualFolder | null;
	let segments: string[];

	if (path.startsWith("/")) {
		current = workingDirectory.getRoot();
		segments = path.split("/").filter(Boolean);
	} else if (path.startsWith("~")) {
		const home = workingDirectory.getRoot().navigate("~");
		if (!home || home.isFile())
			return null;

		current = home;
		segments = path.split("/").filter((segment, index) => !(index === 0 && segment === "~"));
	} else {
		current = workingDirectory;
		segments = path.split("/").filter(Boolean);
	}

	for (const segment of segments) {
		if (segment === ".")
			continue;
		if (segment === "..") {
			current = current.parent ?? current;
			continue;
		}

		if (current.findFile(segment))
			return null;

		let next = current.findSubFolder(segment);
		if (!next) {
			current.createFolder(segment);
			next = current.findSubFolder(segment);
		}

		if (!next || next.isFile())
			return null;

		current = next;
	}

	return current;
}

export const unzip = new Command()
	.setManual({
		purpose: "Extract compressed files in a ZIP archive",
		usage: "unzip FILE [OPTION]...",
		description: "Extract files from a zip archive.",
		options: {
			"-d DIR": "Extract files into DIR",
		},
	})
	.addOption({ short: "d", long: "directory", isInput: true })
	.setRequireArgs(true)
	.setExecute(async function(this: Command, args, { workingDirectory, options, inputs, stderr }) {
		const archivePath = args[0];
		const archive = workingDirectory.navigate(archivePath);

		if (!archive)
			return Shell.writeError(stderr, this.name, `${archivePath}: ${Shell.INVALID_PATH_ERROR}`);
		if (archive.isFolder())
			return Shell.writeError(stderr, this.name, `${archivePath}: Is a directory`);

		const rawContent = await archive.read();
		if (rawContent == null)
			return Shell.writeError(stderr, this.name, `${archivePath}: Invalid archive`);

		let parsed: ZipArchive;
		try {
			parsed = JSON.parse(rawContent) as ZipArchive;
		} catch {
			return Shell.writeError(stderr, this.name, `${archivePath}: Invalid archive`);
		}

		if (parsed.format !== "prozilla-archive" || parsed.type !== "zip" || !Array.isArray(parsed.entries))
			return Shell.writeError(stderr, this.name, `${archivePath}: Invalid archive`);

		const outputDirectory = options.includes("d") ? inputs.d : ".";
		const destinationRoot = ensureDirectoryPath(workingDirectory, outputDirectory);
		if (!destinationRoot)
			return Shell.writeError(stderr, this.name, `${outputDirectory}: ${Shell.INVALID_PATH_ERROR}`);

		let exitCode: number = EXIT_CODE.success;

		for (const entry of parsed.entries) {
			if (!entry.path || entry.path.startsWith("/") || entry.path.startsWith("~")) {
				exitCode = await Shell.writeError(stderr, this.name, `${entry.path || "<empty>"}: Invalid archive path`);
				continue;
			}

			const normalized = normalizePath(entry.path);
			const { parentPath, name } = splitPath(normalized);
			const parent = parentPath === "." ? destinationRoot : ensureDirectoryPath(destinationRoot, parentPath);
			if (!parent) {
				exitCode = await Shell.writeError(stderr, this.name, `${entry.path}: ${Shell.INVALID_PATH_ERROR}`);
				continue;
			}

			if (parent.findSubFolder(name)) {
				exitCode = await Shell.writeError(stderr, this.name, `${entry.path}: Is a directory`);
				continue;
			}

			const { name: baseName, extension } = VirtualFile.splitId(name);
			const normalizedExtension = extension ?? undefined;
			parent.createFile(baseName, normalizedExtension, (file) => {
				if (!file.isFile())
					return;

				if (entry.source != null)
					file.setSource(entry.source);
				else
					file.setContent(entry.content ?? "");
			});
		}

		return exitCode;
	});

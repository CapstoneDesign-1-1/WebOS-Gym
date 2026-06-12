import { EXIT_CODE } from "../../../constants";
import { VirtualFolder } from "../../virtual-drive";
import { Command } from "../command";
import { Shell } from "../shell";

export const mkdir = new Command()
	.setManual({
		purpose: "Create a directory",
		usage: "mkdir [OPTION]... DIRECTORY...",
		description: "Create the DIRECTORY(ies), if they do not already exist.",
		options: {
			"-p": "No error if existing, make parent directories as needed",
		},
	})
	.addOption({ short: "p", long: "parents" })
	.setRequireArgs(true)
	.setExecute(async function(this: Command, args, { workingDirectory, stderr, options }) {
		const createParents = options.includes("p");
		let exitCode: number = EXIT_CODE.success;

		for (const rawPath of args) {
			if (createParents) {
				const created = ensureDirectoryPath(workingDirectory, rawPath);
				if (!created)
					exitCode = await Shell.writeError(stderr, this.name, `${rawPath}: ${Shell.INVALID_PATH_ERROR}`);
				continue;
			}

			const path = normalizePath(rawPath);
			const { parentPath, name } = splitPath(path);

			if (!name) {
				exitCode = await Shell.writeError(stderr, this.name, `${rawPath}: Invalid path`);
				continue;
			}

			const parent = resolveParent(workingDirectory, parentPath);

			if (!parent) {
				exitCode = await Shell.writeError(stderr, this.name, `${rawPath}: ${Shell.INVALID_PATH_ERROR}`);
				continue;
			}

			const existingFolder = parent.findSubFolder(name);
			if (existingFolder) {
				exitCode = await Shell.writeError(stderr, this.name, `${rawPath}: File exists`);
				continue;
			}

			if (parent.findFile(name)) {
				exitCode = await Shell.writeError(stderr, this.name, `${rawPath}: File exists`);
				continue;
			}

			parent.createFolder(name);
		}

		return exitCode;
	});

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

function resolveParent(workingDirectory: VirtualFolder, parentPath: string): VirtualFolder | null {
	if (parentPath === ".")
		return workingDirectory;

	const parent = workingDirectory.navigate(parentPath);
	if (!parent || parent.isFile())
		return null;

	return parent;
}

function ensureDirectoryPath(workingDirectory: VirtualFolder, rawPath: string): VirtualFolder | null {
	const path = normalizePath(rawPath);
	if (!path || path === "/")
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

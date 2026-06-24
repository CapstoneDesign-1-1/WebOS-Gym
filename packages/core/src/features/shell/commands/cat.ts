import { EXIT_CODE } from "../../../constants";
import { VirtualFile } from "../../virtual-drive";
import { Command } from "../command";
import { Shell } from "../shell";

export const cat = new Command()
	.setManual({
		purpose: "Concatenate files and display on the terminal screen",
		usage: "cat [OPTION]... [FILE]...",
		description: "Concatenate FILE(s) to standard output. With no FILE, or when FILE is -, read standard input.",
		options: {
			"-e": "Display $ at end of each line",
		},
	})
	.addOption({ short: "e", long: "show-ends", isInput: false })
	.setExecute(async function(this: Command, args, { workingDirectory, options, stdout, stderr, stdin, shell }) {
		const formatContent = (content: string) => {
			if (!options.includes("e"))
				return content;

			const lines = content.split("\n");
			const joined = lines.join("$\n");

			return content.endsWith("\n") ? joined : joined + "$";
		};

		if (!args.length) {
			await shell.readRawInput(stdin, async (data) => {
				await stdout.write(options.includes("e") ? data.replace(/\n/g, "$\n") : data);
			});
			return EXIT_CODE.success;
		}

		let exitCode = EXIT_CODE.success;

		for (const path of args) {
			if (path === "-") {
				await shell.readRawInput(stdin, async (data) => {
					await stdout.write(options.includes("e") ? data.replace(/\n/g, "$\n") : data);
				});
				continue;
			}

			const target = workingDirectory.navigate(path);
			if (!target) {
				exitCode = await Shell.writeError(stderr, this.name, `${path}: ${Shell.INVALID_PATH_ERROR}`);
				continue;
			}

			if (target.isFolder()) {
				exitCode = await Shell.writeError(stderr, this.name, `${path}: Is a directory`);
				continue;
			}

			let content = await target.read();
			if (content == null)
				content = await readTextFallback(target);

			if (content == null) {
				exitCode = await Shell.writeError(stderr, this.name, `${path}: Cannot read file`);
				continue;
			}

			await stdout.write(formatContent(content));
		}

		return exitCode;
	});

async function readTextFallback(file: VirtualFile): Promise<string | null> {
	if (file.content != null)
		return file.content;

	if (!file.source)
		return null;

	if (file.source.startsWith("http") || file.source.startsWith("/")) {
		try {
			return await fetch(file.source).then((response) => response.text());
		} catch {
			return null;
		}
	}

	return null;
}

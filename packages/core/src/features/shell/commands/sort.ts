import { EXIT_CODE } from "../../../constants";
import { Command } from "../command";
import { Shell } from "../shell";
import { Stream } from "../streams/stream";

function compareLines(a: string, b: string, options: string[]) {
	const ignoreCase = options.includes("f");
	const numeric = options.includes("n");

	const left = ignoreCase ? a.toLowerCase() : a;
	const right = ignoreCase ? b.toLowerCase() : b;

	if (numeric) {
		const leftNum = Number.parseFloat(left);
		const rightNum = Number.parseFloat(right);
		const leftIsNumber = Number.isFinite(leftNum);
		const rightIsNumber = Number.isFinite(rightNum);

		if (leftIsNumber && rightIsNumber)
			return leftNum - rightNum;
		if (leftIsNumber)
			return -1;
		if (rightIsNumber)
			return 1;
	}

	return left.localeCompare(right);
}

function sortLines(lines: string[], options: string[]): string[] {
	const sorted = [...lines].sort((a, b) => compareLines(a, b, options));

	if (options.includes("u")) {
		const unique: string[] = [];
		for (const line of sorted) {
			if (!unique.length || compareLines(unique[unique.length - 1], line, options) !== 0)
				unique.push(line);
		}
		return options.includes("r") ? unique.reverse() : unique;
	}

	return options.includes("r") ? sorted.reverse() : sorted;
}

export const sort = new Command()
	.setManual({
		purpose: "Sort lines of text files",
		usage: "sort [OPTION]... [FILE]...",
		description: "Write sorted concatenation of all FILE(s) to standard output.",
		options: {
			"-r": "Reverse the result of comparisons",
			"-n": "Compare according to string numerical value",
			"-u": "Output only the first of an equal run",
			"-f": "Fold lower case to upper case characters",
		},
	})
	.addOption({ short: "r", long: "reverse" })
	.addOption({ short: "n", long: "numeric-sort" })
	.addOption({ short: "u", long: "unique" })
	.addOption({ short: "f", long: "ignore-case" })
	.setExecute(async function(this: Command, args, { workingDirectory, options, stdout, stderr, stdin }) {
		const lines: string[] = [];
		let exitCode: number = EXIT_CODE.success;

		const consume = (content: string) => {
			const parsed = content.split(/\r?\n/);
			if (content.endsWith("\n") && parsed.length)
				parsed.pop();
			lines.push(...parsed);
		};

		const readStdin = async () => {
			let buffer = "";
			stdin.on(Stream.DATA_EVENT, (data) => {
				buffer += data;
			});
			await stdin.wait();
			consume(buffer);
		};

		if (!args.length) {
			return await Shell.readInput("", stdin, async (data) => {
				consume(data);
				if (lines.length)
					await Shell.printLn(stdout, sortLines(lines, options).join("\n"));
				return EXIT_CODE.success;
			});
		}

		for (const path of args) {
			if (path === "-") {
				await readStdin();
				continue;
			}

			const target = workingDirectory.navigate(path);

			if (!target) {
				exitCode = await Shell.writeError(stderr, this.name, [path, Shell.INVALID_PATH_ERROR]);
				continue;
			}

			if (target.isFolder()) {
				exitCode = await Shell.writeError(stderr, this.name, [path, "Is a directory"]);
				continue;
			}

			const content = await target.read();
			if (content != null)
				consume(content);
		}

		if (lines.length)
			await Shell.printLn(stdout, sortLines(lines, options).join("\n"));
		return exitCode;
	});

import { EXIT_CODE } from "../../../constants";
import { Command } from "../command";
import { Shell } from "../shell";
import { Stream } from "../streams/stream";

type WcStats = {
	lines: number;
	words: number;
	bytes: number;
	chars: number;
};

function countStats(content: string): WcStats {
	const lines = content.split("\n").length - 1;
	const words = content.trim().length ? content.trim().split(/\s+/).length : 0;
	const bytes = new TextEncoder().encode(content).length;
	const chars = [...content].length;

	return { lines, words, bytes, chars };
}

function selectMetrics(options: string[]): Array<"l" | "w" | "c" | "m"> {
	const hasSelection = options.includes("l") || options.includes("w") || options.includes("c") || options.includes("m");

	if (!hasSelection)
		return ["l", "w", "c"];

	const ordered: Array<"l" | "w" | "c" | "m"> = [];
	if (options.includes("l")) ordered.push("l");
	if (options.includes("w")) ordered.push("w");
	if (options.includes("c")) ordered.push("c");
	if (options.includes("m")) ordered.push("m");
	return ordered;
}

function formatOutput(stats: WcStats, metrics: Array<"l" | "w" | "c" | "m">, label?: string): string {
	const values = metrics.map((metric) => {
		switch (metric) {
			case "l":
				return String(stats.lines);
			case "w":
				return String(stats.words);
			case "c":
				return String(stats.bytes);
			case "m":
				return String(stats.chars);
		}
	});

	return label ? `${values.join(" ")} ${label}` : values.join(" ");
}

export const wc = new Command()
	.setManual({
		purpose: "Print newline, word, and byte counts",
		usage: "wc [OPTION]... [FILE]...",
		description: "Count lines, words, bytes, and characters in files or standard input.",
		options: {
			"-l": "Print the newline counts",
			"-w": "Print the word counts",
			"-c": "Print the byte counts",
			"-m": "Print the character counts",
		},
	})
	.addOption({ short: "l", long: "lines" })
	.addOption({ short: "w", long: "words" })
	.addOption({ short: "c", long: "bytes" })
	.addOption({ short: "m", long: "chars" })
	.setExecute(async function(this: Command, args, { workingDirectory, options, stdout, stderr, stdin }) {
		const metrics = selectMetrics(options);
		const totals: WcStats = { lines: 0, words: 0, bytes: 0, chars: 0 };
		let processed = 0;
		let exitCode = EXIT_CODE.success;

		async function output(content: string, label?: string) {
			const stats = countStats(content);
			totals.lines += stats.lines;
			totals.words += stats.words;
			totals.bytes += stats.bytes;
			totals.chars += stats.chars;
			processed++;
			await Shell.printLn(stdout, formatOutput(stats, metrics, label));
		}

		async function readStdin(label?: string) {
			let buffer = "";
			stdin.on(Stream.DATA_EVENT, (data) => {
				buffer += data;
			});
			await stdin.wait();
			await output(buffer, label);
		}

		if (!args.length) {
			await readStdin();
			return exitCode;
		}

		for (const path of args) {
			if (path === "-") {
				await readStdin("-");
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
				await output(content, path);
		}

		if (processed > 1)
			await Shell.printLn(stdout, formatOutput(totals, metrics, "total"));

		return exitCode;
	});

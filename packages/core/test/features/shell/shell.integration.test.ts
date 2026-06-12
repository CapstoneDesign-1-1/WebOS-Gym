import { describe, it, expect, beforeEach, vi } from "vitest";
import { Shell } from "../../../src/features";
import { MockSystemManager } from "../system/system.utils";
import { MockVirtualRoot } from "../virtual-drive/virtualDrive.utils";
import { MockSettingsManager } from "../settings/settings.utils";
import { Vector2 } from "@prozilla-os/shared";
import { EXIT_CODE } from "../../../src/constants";

describe("Shell", () => {
	let shell: Shell;

	beforeEach(() => {
		const mockSystemManager = new MockSystemManager();
		const mockVirtualRoot = new MockVirtualRoot(mockSystemManager);
		const mockSettingsManager = new MockSettingsManager(mockVirtualRoot);

		const mockConfig = {
			systemManager: mockSystemManager,
			virtualRoot: mockVirtualRoot,
			settingsManager: mockSettingsManager,
			exit: vi.fn(),
			sizeRef: { current: new Vector2(80, 24) },
		};
		shell = new Shell(mockConfig);
	});

	it("executes echo and captures output in history", async () => {
		await shell.run("echo Hello World");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("Hello World");
	});

	it("respects the -n flag in echo to omit newline", async () => {
		await shell.run("echo -n No Newline");

		expect(shell.state.ttyBuffer).toBe("No Newline");
	});

	it("pipes output from echo to rev", async () => {
		await shell.run("echo hello | rev");

		const output = shell.state.history.at(-1);
		if (shell.state.ttyBuffer === "olleh") {
			expect(shell.state.ttyBuffer).toBe("olleh");
		} else {
			expect(output?.displayText).toBe("olleh");
		}
	});

	it("properly reports command not found in a pipeline and stops", async () => {
		const exitCode = await shell.run("fakecommand | rev");

		expect(exitCode).toBe(EXIT_CODE.success);
        
		const historyTexts = shell.state.history.map((entry) => entry.displayText);
		expect(historyTexts.some((text) => text?.includes("fakecommand: Command not found"))).toBe(true);
	});

	it("handles complex pipelines with multiple stages", async () => {
		await shell.run("echo abc | rev | rev");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("abc");
	});

	it("renames files with mv", async () => {
		await shell.run("cd Documents && touch note.txt && mv note.txt renamed.txt");

		const documents = shell.config.virtualRoot.navigateToFolder("~/Documents");
		expect(documents?.findFile("note", "txt")).toBeNull();
		expect(documents?.findFile("renamed", "txt")).not.toBeNull();
	});

	it("moves files into another directory with mv", async () => {
		await shell.run("cd Documents && mkdir work && touch note.txt && mv note.txt work/");

		const documents = shell.config.virtualRoot.navigateToFolder("~/Documents");
		const work = shell.config.virtualRoot.navigateToFolder("~/Documents/work");
		expect(documents?.findFile("note", "txt")).toBeNull();
		expect(work?.findFile("note", "txt")).not.toBeNull();
	});

	it("creates nested directories with mkdir path arguments", async () => {
		await shell.run("cd Documents && mkdir tree_demo && mkdir tree_demo/src");

		const treeDemo = shell.config.virtualRoot.navigateToFolder("~/Documents/tree_demo");
		expect(treeDemo).not.toBeNull();
		expect(treeDemo?.findSubFolder("src")).not.toBeNull();
		expect(shell.config.virtualRoot.navigateToFolder("~/Documents/tree_demo/src")).not.toBeNull();
	});

	it("creates missing parent directories with mkdir -p", async () => {
		await shell.run("cd Documents && mkdir -p nested/one/two");

		expect(shell.config.virtualRoot.navigateToFolder("~/Documents/nested")).not.toBeNull();
		expect(shell.config.virtualRoot.navigateToFolder("~/Documents/nested/one")).not.toBeNull();
		expect(shell.config.virtualRoot.navigateToFolder("~/Documents/nested/one/two")).not.toBeNull();
	});

	it("creates files at nested paths with touch", async () => {
		await shell.run("cd Documents && mkdir -p tree_demo/src && touch tree_demo/README.md tree_demo/src/main.txt");

		expect(shell.config.virtualRoot.navigateToFile("~/Documents/tree_demo/README.md")).not.toBeNull();
		expect(shell.config.virtualRoot.navigateToFile("~/Documents/tree_demo/src/main.txt")).not.toBeNull();
	});

	it("creates hidden files with touch", async () => {
		await shell.run("cd Documents && mkdir -p tree_demo && touch tree_demo/.hidden_file");

		expect(shell.config.virtualRoot.navigateToFile("~/Documents/tree_demo/.hidden_file")).not.toBeNull();
	});

	it("removes nested files with rm path", async () => {
		await shell.run("cd Documents && mkdir -p remove_demo && touch remove_demo/a.txt && rm remove_demo/a.txt");

		expect(shell.config.virtualRoot.navigateToFile("~/Documents/remove_demo/a.txt")).toBeNull();
	});

	it("removes nested directories with rmdir path", async () => {
		await shell.run("cd Documents && mkdir -p remove_dir_demo/inner && rmdir remove_dir_demo/inner");

		expect(shell.config.virtualRoot.navigateToFolder("~/Documents/remove_dir_demo/inner")).toBeNull();
		expect(shell.config.virtualRoot.navigateToFolder("~/Documents/remove_dir_demo")).not.toBeNull();
	});

	it("copies files with cp", async () => {
		await shell.run("cd Documents && cp text.txt copy.txt");

		const documents = shell.config.virtualRoot.navigateToFolder("~/Documents");
		expect(documents?.findFile("text", "txt")).not.toBeNull();
		expect(documents?.findFile("copy", "txt")).not.toBeNull();
		expect(await documents?.findFile("copy", "txt")?.read()).toBe("Hello world!");
	});

	it("copies files into another directory with cp", async () => {
		await shell.run("cd Documents && mkdir work && cp text.txt work/");

		const documents = shell.config.virtualRoot.navigateToFolder("~/Documents");
		const work = shell.config.virtualRoot.navigateToFolder("~/Documents/work");
		expect(documents?.findFile("text", "txt")).not.toBeNull();
		expect(work?.findFile("text", "txt")).not.toBeNull();
		expect(await work?.findFile("text", "txt")?.read()).toBe("Hello world!");
	});

	it("lists files recursively with find .", async () => {
		await shell.run("cd Documents && find .");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("/home/prozilla-os/Documents");
		expect(output).toContain("/home/prozilla-os/Documents/text.txt");
	});

	it("lists files recursively with find on an explicit path", async () => {
		await shell.run("find ~/Scripts");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("/home/prozilla-os/Scripts");
		expect(output).toContain("/home/prozilla-os/Scripts/helloworld.sh");
	});

	it("prints builtin command names with which", async () => {
		await shell.run("which ls");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("ls");
	});

	it("prints executable file paths with which", async () => {
		await shell.run("which ~/Scripts/fizzbuzz.sh");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("/home/prozilla-os/Scripts/fizzbuzz.sh");
	});

	it("counts lines, words, and bytes from stdin with wc", async () => {
		await shell.run("echo hello world | wc");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("1 2 12");
	});

	it("counts words only with wc -w", async () => {
		await shell.run("echo hello world from prozilla | wc -w");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("4");
	});

	it("counts file content and prints file label with wc", async () => {
		await shell.run("wc ~/Documents/text.txt");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("0 2 12 ~/Documents/text.txt");
	});

	it("sorts file lines lexicographically", async () => {
		const documents = shell.config.virtualRoot.navigateToFolder("~/Documents");
		documents?.createFile("sort_demo", "txt", (file) => {
			file.setContent(["pear", "apple", "banana"]);
		});

		await shell.run("sort ~/Documents/sort_demo.txt");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("apple");
		expect(output).toContain("banana");
		expect(output).toContain("pear");
		expect(output.indexOf("apple")).toBeLessThan(output.indexOf("banana"));
		expect(output.indexOf("banana")).toBeLessThan(output.indexOf("pear"));
	});

	it("supports numeric reverse unique sort", async () => {
		const documents = shell.config.virtualRoot.navigateToFolder("~/Documents");
		documents?.createFile("sort_numbers", "txt", (file) => {
			file.setContent(["10", "2", "2", "1"]);
		});

		await shell.run("sort -nru ~/Documents/sort_numbers.txt");

		const outputLines = shell.state.history
			.filter((entry) => entry.input == null)
			.slice(-3)
			.map((entry) => entry.displayText)
			.filter(Boolean);
		expect(outputLines).toEqual(["10", "2", "1"]);
	});

	it("prints an error when sorting a directory", async () => {
		await shell.run("sort ~/Documents");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("sort: ~/Documents: Is a directory");
	});

	it("prints a tree for a directory", async () => {
		await shell.run("cd ~/Documents && mkdir work && touch work/note.txt && tree .");

		const output = shell.state.history.filter((entry) => entry.input == null).slice(-8).map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("Documents");
		expect(output).toContain("work");
		expect(output).toContain("note.txt");
		expect(output).toMatch(/director(?:y|ies)/);
		expect(output).toContain("files");
	});

	it("limits tree depth with -L", async () => {
		await shell.run("cd ~/Documents && mkdir deep && mkdir deep/inner && touch deep/inner/file.txt && tree -L 1 .");

		const output = shell.state.history.filter((entry) => entry.input == null).slice(-8).map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("deep");
		expect(output).not.toContain("inner");
		expect(output).not.toContain("file.txt");
	});

	it("prints an error when tree path does not exist", async () => {
		await shell.run("tree ~/missing-path");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("tree: ~/missing-path: No such file or directory");
	});

	it("prints builtin locations with whereis", async () => {
		await shell.run("whereis ls");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("ls: ls");
	});

	it("prints file locations with whereis", async () => {
		await shell.run("whereis ~/Scripts/fizzbuzz.sh");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("~/Scripts/fizzbuzz.sh: /home/prozilla-os/Scripts/fizzbuzz.sh");
	});

	it("prints command label even when whereis has no match", async () => {
		await shell.run("whereis definitely-not-a-command");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("definitely-not-a-command:");
	});

	it("supports sudo command forwarding", async () => {
		await shell.run("sudo which ls");

		const output = shell.state.history.at(-1);
		expect(output?.displayText).toBe("ls");
	});

	it("prints identity with id", async () => {
		await shell.run("id");

		const output = shell.state.history.at(-1)?.displayText;
		expect(output).toContain("uid=1000(user)");
		expect(output).toContain("gid=1000(user)");
	});

	it("prints system information with uname", async () => {
		await shell.run("uname -a");

		const output = shell.state.history.at(-1)?.displayText;
		expect(output).toContain("ProzillaOS");
		expect(output).toContain("prozilla-os");
	});

	it("prints storage usage with df", async () => {
		await shell.run("df");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("Filesystem");
		expect(output).toContain("virtual");
	});

	it("prints usage summary with du", async () => {
		await shell.run("du ~/Documents");

		const output = shell.state.history.at(-1)?.displayText;
		expect(output).toContain("/home/prozilla-os/Documents");
	});

	it("runs chmod on existing files", async () => {
		await shell.run("chmod 644 ~/Documents/text.txt");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).not.toContain("chmod:");
	});

	it("runs chown on existing files", async () => {
		await shell.run("chown user ~/Documents/text.txt");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).not.toContain("chown:");
	});

	it("prints process list with ps", async () => {
		await shell.run("ps");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("PID TTY TIME CMD");
		expect(output).toContain("shell");
	});

	it("prints top snapshot", async () => {
		await shell.run("top");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("Tasks:");
		expect(output).toContain("PID USER COMMAND");
	});

	it("accepts known pids with kill", async () => {
		await shell.run("kill 1");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).not.toContain("kill:");
	});

	it("reports missing processes with pkill", async () => {
		await shell.run("pkill definitely-no-process");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("pkill: definitely-no-process: no process found");
	});

	it("creates archives with tar -cf", async () => {
		await shell.run("cd Documents && tar -cf test.tar text.txt");

		expect(shell.config.virtualRoot.navigateToFile("~/Documents/test.tar")).not.toBeNull();
	});

	it("creates archives with zip", async () => {
		await shell.run("cd Documents && zip test.zip text.txt");

		expect(shell.config.virtualRoot.navigateToFile("~/Documents/test.zip")).not.toBeNull();
	});

	it("extracts archives with unzip", async () => {
		await shell.run("cd Documents && zip test.zip text.txt && unzip test.zip -d out");

		expect(shell.config.virtualRoot.navigateToFile("~/Documents/out/text.txt")).not.toBeNull();
	});

	it("prints ping statistics", async () => {
		await shell.run("ping -c 2 localhost");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("PING localhost");
		expect(output).toContain("2 packets transmitted, 2 received");
	});

	it("prints interface info with ip addr", async () => {
		await shell.run("ip addr");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("1: lo:");
		expect(output).toContain("2: eth0:");
	});

	it("prints interface info with ifconfig", async () => {
		await shell.run("ifconfig");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("eth0:");
		expect(output).toContain("lo:");
	});

	it("lists snap packages", async () => {
		await shell.run("snap list");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("Name Version Rev");
		expect(output).toContain("prozilla-os");
	});

	it("lists dpkg packages", async () => {
		await shell.run("dpkg -l");

		const output = shell.state.history.map((entry) => entry.displayText).filter(Boolean).join("\n");
		expect(output).toContain("||/ Name");
		expect(output).toContain("prozilla-os");
	});

	it("prints python3 version", async () => {
		await shell.run("python3 --version");

		const output = shell.state.history.at(-1)?.displayText;
		expect(output).toBe("Python 3.12.4");
	});
});

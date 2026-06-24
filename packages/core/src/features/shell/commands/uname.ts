import { Command } from "../command";
import { Shell } from "../shell";

function normalizeArch(value: string): string {
	if (value === "x86_64")
		return "x86_64";
	if (value === "arm64")
		return "aarch64";
	return value;
}

export const uname = new Command()
	.setManual({
		purpose: "Print system information",
		usage: "uname [OPTION]...",
		description: "Print certain system information.",
		options: {
			"-a": "Print all information",
			"-s": "Print kernel name",
			"-n": "Print network node hostname",
			"-r": "Print kernel release",
			"-m": "Print machine hardware name",
		},
	})
	.addOption({ short: "a", long: "all" })
	.addOption({ short: "s", long: "kernel-name" })
	.addOption({ short: "n", long: "nodename" })
	.addOption({ short: "r", long: "kernel-release" })
	.addOption({ short: "m", long: "machine" })
	.setExecute(async function(_args, { options, hostname, stdout }) {
		const kernelName = "ProzillaOS";
		const kernelRelease = "1.0";
		const machine = normalizeArch(typeof navigator !== "undefined" ? navigator.platform.toLowerCase() : "unknown");

		if (options.includes("a")) {
			await Shell.printLn(stdout, `${kernelName} ${hostname} ${kernelRelease} ${machine}`);
			return;
		}

		const selected: string[] = [];
		if (options.includes("s")) selected.push(kernelName);
		if (options.includes("n")) selected.push(hostname);
		if (options.includes("r")) selected.push(kernelRelease);
		if (options.includes("m")) selected.push(machine);

		await Shell.printLn(stdout, selected.length ? selected.join(" ") : kernelName);
	});

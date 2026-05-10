import { Storage } from "../../storage/storage";
import { Command } from "../command";
import { Shell } from "../shell";

function formatBytes(bytes: number): string {
	if (bytes >= 1_000_000)
		return `${(bytes / 1_000_000).toFixed(1)}M`;
	if (bytes >= 1_000)
		return `${(bytes / 1_000).toFixed(1)}K`;
	return `${bytes}B`;
}

export const df = new Command()
	.setManual({
		purpose: "Report file system disk space usage",
		usage: "df",
		description: "Display amount of available disk space on the virtual filesystem.",
	})
	.setExecute(async function(_args, { virtualRoot, stdout }) {
		const total = Storage.MAX_BYTES;
		const serialized = virtualRoot.toString() ?? "";
		const used = Storage.getByteSize(serialized);
		const available = Math.max(0, total - used);
		const percent = Math.min(100, Math.round(used / total * 100));

		await Shell.printLn(stdout, "Filesystem Size Used Avail Use% Mounted on");
		await Shell.printLn(stdout, `virtual ${formatBytes(total)} ${formatBytes(used)} ${formatBytes(available)} ${percent}% /`);
	});

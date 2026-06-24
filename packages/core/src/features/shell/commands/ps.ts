import { Command } from "../command";
import { Shell } from "../shell";

export const ps = new Command()
	.setManual({
		purpose: "Report a snapshot of current processes",
		usage: "ps",
		description: "Display currently running shell-related processes.",
	})
	.setExecute(async function(_args, { env, stdout }) {
		const shellPid = env.get("$") ?? "1000";

		await Shell.printLn(stdout, "PID TTY TIME CMD");
		await Shell.printLn(stdout, "1 ? 00:00:00 init");
		await Shell.printLn(stdout, `${shellPid} pts/0 00:00:00 shell`);
	});

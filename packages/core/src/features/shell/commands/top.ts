import { Command } from "../command";
import { Shell } from "../shell";

export const top = new Command()
	.setManual({
		purpose: "Display Linux tasks",
		usage: "top",
		description: "Display process activity in a non-interactive snapshot.",
	})
	.setExecute(async function(_args, { env, stdout, hostname }) {
		const shellPid = env.get("$") ?? "1000";

		await Shell.printLn(stdout, `top - ${hostname}`);
		await Shell.printLn(stdout, "Tasks: 2 total, 1 running, 1 sleeping");
		await Shell.printLn(stdout, "%Cpu(s): 3.0 us, 1.0 sy, 96.0 id");
		await Shell.printLn(stdout, "PID USER COMMAND");
		await Shell.printLn(stdout, "1 root init");
		await Shell.printLn(stdout, `${shellPid} user shell`);
	});

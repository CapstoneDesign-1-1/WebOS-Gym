import { EXIT_CODE } from "../../../constants";
import { Command } from "../command";
import { Shell } from "../shell";

function parsePid(value: string): number | null {
	if (!/^\d+$/.test(value))
		return null;

	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? null : parsed;
}

export const kill = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Send a signal to a process",
		usage: "kill [-SIGNAL] PID...",
		description: "Send a signal to each PID.",
	})
	.setExecute(async function(this: Command, args, { env, stderr }) {
		const shellPid = parsePid(env.get("$") ?? "") ?? 1000;
		const knownPids = new Set<number>([1, shellPid]);

		const pidArgs = args[0]?.startsWith("-") ? args.slice(1) : args;
		if (!pidArgs.length)
			return Shell.writeError(stderr, this.name, Shell.USAGE_ERROR);

		let exitCode = EXIT_CODE.success;

		for (const pidArg of pidArgs) {
			const pid = parsePid(pidArg);
			if (pid == null) {
				exitCode = await Shell.writeError(stderr, this.name, `${pidArg}: arguments must be process IDs`);
				continue;
			}

			if (!knownPids.has(pid))
				exitCode = await Shell.writeError(stderr, this.name, `(${pidArg}) - No such process`);
		}

		return exitCode;
	});

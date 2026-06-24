import { Command } from "../command";
import { Shell } from "../shell";

export const sudo = new Command()
	.setManual({
		purpose: "Execute a command as superuser",
		usage: "sudo COMMAND [ARG]...",
		description: "Run COMMAND with elevated privileges.",
	})
	.setRequireArgs(true)
	.setExecute(async function(_args, { stderr }) {
		return Shell.writeError(stderr, "sudo", "Internal dispatch error");
	});

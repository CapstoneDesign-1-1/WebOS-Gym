import { Command } from "../command";
import { Shell } from "../shell";

export const id = new Command()
	.setManual({
		purpose: "Print real and effective user and group IDs",
		usage: "id",
		description: "Display user and group identity information.",
	})
	.setExecute(async function(_args, { username, stdout }) {
		await Shell.printLn(stdout, `uid=1000(${username}) gid=1000(${username}) groups=1000(${username})`);
	});

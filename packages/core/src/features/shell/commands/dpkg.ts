import { Command } from "../command";
import { Shell } from "../shell";

export const dpkg = new Command()
	.setManual({
		purpose: "Package manager for Debian",
		usage: "dpkg -l",
		description: "List installed packages.",
		options: {
			"-l": "List packages",
		},
	})
	.addOption({ short: "l", long: "list" })
	.setExecute(async function(this: Command, _args, { options, stdout, stderr }) {
		if (!options.includes("l"))
			return Shell.writeError(stderr, this.name, Shell.USAGE_ERROR);

		await Shell.printLn(stdout, "Desired=Unknown/Install/Remove/Purge/Hold");
		await Shell.printLn(stdout, "| Status=Not/Installed/Config-files/Unpacked/Failed-config/Half-installed");
		await Shell.printLn(stdout, "||/ Name           Version      Architecture Description");
		await Shell.printLn(stdout, "ii  prozilla-os    1.0          all          ProzillaOS virtual package");
		await Shell.printLn(stdout, "ii  coreutils      9.5          all          Virtual GNU core utilities");
	});

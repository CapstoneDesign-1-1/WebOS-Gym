import { Command } from "../command";
import { Shell } from "../shell";

async function printAddressView(stdout: Parameters<typeof Shell.printLn>[0]) {
	await Shell.printLn(stdout, "1: lo: <LOOPBACK,UP> mtu 65536 state UNKNOWN");
	await Shell.printLn(stdout, "    inet 127.0.0.1/8 scope host lo");
	await Shell.printLn(stdout, "2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500 state UP");
	await Shell.printLn(stdout, "    inet 10.0.0.2/24 brd 10.0.0.255 scope global eth0");
}

export const ip = new Command()
	.setManual({
		purpose: "Show and manipulate routing, devices, policy routing and tunnels",
		usage: "ip [ addr ]",
		description: "Display network interface information.",
	})
	.setExecute(async function(this: Command, args, { stdout, stderr }) {
		const sub = args[0];

		if (!sub || sub === "addr" || sub === "a")
			return printAddressView(stdout);

		return Shell.writeError(stderr, this.name, Shell.USAGE_ERROR);
	});

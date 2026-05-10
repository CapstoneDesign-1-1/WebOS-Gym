import { Command } from "../command";
import { Shell } from "../shell";

export const ifconfig = new Command()
	.setManual({
		purpose: "Configure network interface parameters",
		usage: "ifconfig",
		description: "Display network interface configuration.",
	})
	.setExecute(async function(_args, { stdout }) {
		await Shell.printLn(stdout, "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500");
		await Shell.printLn(stdout, "        inet 10.0.0.2  netmask 255.255.255.0  broadcast 10.0.0.255");
		await Shell.printLn(stdout, "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536");
		await Shell.printLn(stdout, "        inet 127.0.0.1  netmask 255.0.0.0");
	});

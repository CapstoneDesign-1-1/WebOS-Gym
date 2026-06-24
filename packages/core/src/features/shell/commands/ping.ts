import { parseOptionalInteger } from "@prozilla-os/shared";
import { Command } from "../command";
import { Shell } from "../shell";

export const ping = new Command()
	.setRequireArgs(true)
	.setManual({
		purpose: "Send ICMP ECHO_REQUEST to network hosts",
		usage: "ping [OPTION]... HOST",
		description: "Print ping statistics for HOST.",
		options: {
			"-c COUNT": "Stop after sending COUNT packets",
		},
	})
	.addOption({ short: "c", long: "count", isInput: true })
	.setExecute(async function(args, { inputs, stdout }) {
		const host = args[0];
		const count = Math.max(1, parseOptionalInteger(inputs.c, 4));

		await Shell.printLn(stdout, `PING ${host} (${host}) 56(84) bytes of data.`);

		for (let index = 1; index <= count; index++) {
			await Shell.printLn(stdout, `64 bytes from ${host}: icmp_seq=${index} ttl=64 time=1.0 ms`);
		}

		await Shell.printLn(stdout, "");
		await Shell.printLn(stdout, `--- ${host} ping statistics ---`);
		await Shell.printLn(stdout, `${count} packets transmitted, ${count} received, 0% packet loss`);
	});

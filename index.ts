import { log } from "./helper.ts";

function init() {
	const controlProcess = Deno.run({ cmd: ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-run", "main.ts"] });
	log("control process started");

	controlProcess.status().then((status) => {
		log(`control process exited with code ${status.code}, restarting`);
		init();
	});
}

init();
import { closeDisplayProcess, initDisplayProcess, initPixelUpdates } from "./pixels.ts";
import { init as initServer } from "./server.ts";

import "./effects/alarm.ts";
import "./effects/clock.ts";
import "./effects/disco.ts";
import "./effects/networkLight.ts";
import "./effects/light.ts";
import "./effects/manager.ts"; // must be added last
import { createEffect, exportState, importState, initState } from "./effect.ts";
import { devMode } from "./config.ts";

async function init() {
	initDisplayProcess();

	let loadedState;
	try {
		loadedState = await Deno.readTextFile("./state.json");
	} catch { }

	if (loadedState !== undefined) {
		importState(loadedState);
	} else {
		initState();
		await saveState();
	}

	setInterval(saveState, 10000);
	globalThis.addEventListener("beforeunload", exitProgram);
	Deno.addSignalListener("SIGINT", exitProgram);

	if (!devMode) {
		Deno.writeTextFile("/sys/class/leds/led0/trigger", "none");
		Deno.writeTextFile("/sys/class/leds/led1/trigger", "none");
	}

	initPixelUpdates(() => {
		if (devMode) return;
		const actLight = String(Number(Date.now() % 1000 < 500));
		Deno.writeTextFile("/sys/class/leds/led0/brightness", actLight)
	});
	initServer();
}

async function exitProgram() {
	await saveState();
	closeDisplayProcess();
	Deno.exit();
}

async function saveState() {
	const state = exportState();

	// check that the disk needs to be updated before writing
	// this prevents unneeded writes on SD card
	let savedState;
	try {
		savedState = await Deno.readTextFile("./state.json");
	} catch { }
	if (savedState === state) return;

	await Deno.writeTextFile("./state.json", state);
}

init();
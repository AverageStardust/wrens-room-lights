import { constrain, log } from "./helper.ts";
import { rgb24 } from "https://deno.land/std@0.151.0/fmt/colors.ts";
import { update as updateEffects } from "./effect.ts";
import { devMode, pixelCount } from "./config.ts";

let displayProcess: Deno.Process | null = null;
let lastPixels: [number, number, number][] | null = null;
let updateCallback: () => void;

export function initPixelUpdates(callback = () => { }) {
	lastUpdateTime = Date.now();
	updateCallback = callback;
	update();
}

function update() {
	const pixels: [number, number, number][] = Array(pixelCount).fill(null).map(() => [0, 0, 0]);

	updateEffects(pixels);

	let pixelsChanged = false;
	if (lastPixels === null) {
		pixelsChanged = true;
	} else {
		for (let i = 0; i < pixels.length; i++) {
			if (Math.abs(pixels[i][0] - lastPixels[i][0]) > 0.001 ||
				Math.abs(pixels[i][1] - lastPixels[i][1]) > 0.001 ||
				Math.abs(pixels[i][2] - lastPixels[i][2]) > 0.001) {
				pixelsChanged = true;
				break;
			}
		}
	}

	lastPixels = pixels;

	updateCallback();

	if (!pixelsChanged) {
		updateAfter(33.33);
		return;
	}

	writePixels(pixels);
	updateAfter(16.66);
}

let lastUpdateTime: number, updateHandle = -1, syncUpdates = 0;
function updateAfter(delayFromLast: number) {
	clearTimeout(updateHandle);
	const delay = (lastUpdateTime + delayFromLast) - Date.now();

	if (delay <= 0) {
		if (syncUpdates >= 5) {
			lastUpdateTime = Date.now();
			log("poor performance, delayed update schedule");
		}
		lastUpdateTime += delayFromLast;
		syncUpdates++;
		update();
	} else {
		updateHandle = setTimeout(() => {
			lastUpdateTime += delayFromLast;
			syncUpdates = 0;
			update();
		}, delay);
	}
}

function writePixels(pixels: [number, number, number][]) {
	pixels = pixels.map(([r, g, b]) => ([
		constrain(r * r, 0, 1),
		constrain(g * g, 0, 1),
		constrain(b * b, 0, 1)
	]));

	if (devMode) {
		printPixels(pixels);
		return;
	}

	const dataString = JSON.stringify({
		colors: pixels,
		writeId: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
	});

	Deno.writeTextFile("/dev/shm/roomLightData.json", dataString);
}

function printPixels(pixels: [number, number, number][]) {
	console.clear();

	const str = pixels.map(([r, g, b]) => {
		return rgb24("@", { r: r * 255, g: g * 255, b: b * 255 });
	}).join("");

	console.log(str);
}
export function initDisplayProcess() {
	if (devMode) return;
	if (displayProcess !== null) return;

	displayProcess = Deno.run({ cmd: ["sudo", "python3", "display.py", String(pixelCount)] });
	log("display process started");

	displayProcess.status().then((status) => {
		log(`display process exited with code ${status.code}, restarting`);
		displayProcess = null;
		initDisplayProcess();
	});
}

export function closeDisplayProcess() {
	if (devMode) return;
	if (displayProcess === null) return;
	displayProcess.close();
}

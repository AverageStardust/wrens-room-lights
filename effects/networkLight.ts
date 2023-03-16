import { registerEffect } from "../effect.ts";
import { pixelCount } from "../config.ts";
import { networkOptions } from "../server.ts";
import { constrain } from "../helper.ts";

registerEffect("networkLight", {
	networkOption: {
		displayName: "Network Option",
		value: "",
	},
	activePixels: {
		displayName: "LEDs (Max: 30)",
		value: Array(pixelCount).fill(false),
		limit: 30,
	}
}, function (pixels: [number, number, number][]) {
	const activePixels = this.getBooleanArray("activePixels");
	const networkOption = this.getString("networkOption");

	let option = networkOptions.get(networkOption);

	if (!Array.isArray(option) ||
		option.length !== 3 ||
		isNaN(option[0]) ||
		isNaN(option[1]) ||
		isNaN(option[2])) return;

	const color: [number, number, number] = [
		constrain(option[0], 0, 1),
		constrain(option[1], 0, 1),
		constrain(option[2], 0, 1)];

	for (let i = 0; i < pixels.length; i++) {
		if (activePixels[i]) {
			pixels[i] = [...color];
		}
	}
});
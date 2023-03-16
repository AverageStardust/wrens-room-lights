import { registerEffect } from "../effect.ts";
import { pixelCount } from "../config.ts";

registerEffect("light", {
	color: {
		displayName: "Color",
		value: [1, 1, 1]
	},
	activePixels: {
		displayName: "LEDs (Max: 30)",
		value: Array(pixelCount).fill(false),
		limit: 30,
	}
}, function (pixels: [number, number, number][]) {
	const activePixels = this.getBooleanArray("activePixels");
	const color = this.getColor("color");

	for (let i = 0; i < pixels.length; i++) {
		if (activePixels[i]) {
			pixels[i] = [...color];
		}
	}
});
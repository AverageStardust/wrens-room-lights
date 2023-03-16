import { registerEffect } from "../effect.ts";

registerEffect("disco", {
	color: {
		displayName: "Color",
		value: [1, 1, 1]
	},
	speed: {
		displayName: "Speed",
		value: 0.1,
		min: 0.02,
		max: 0.5,
		step: 0.02,
	}
}, function (pixels: [number, number, number][]) {
	const color = this.getColor("color");
	const speed = this.getNumber("speed") * 1000;

	const offset = Math.floor(Date.now() / speed) % 8;

	for (let i = offset; i < pixels.length; i += 8) {
		pixels[i] = [...color];
	}
});
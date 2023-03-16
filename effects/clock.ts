import { registerEffect } from "../effect.ts";
import { pixelCount } from "../config.ts";
import { getDayTime, isTimeBetween, timeUnit } from "../time.ts";

registerEffect("clock", {
	fgColor: {
		displayName: "Foreground",
		value: [1, 1, 1]
	},
	bgColor: {
		displayName: "Background",
		value: [0, 0, 0]
	},
	position: {
		displayName: "Position",
		value: 1,
		min: 1,
		max: pixelCount - 11,
		step: 1,
		strict: true
	},
	start: {
		displayName: "Wake",
		value: [7, 0]
	},
	end: {
		displayName: "Sleep",
		value: [22, 0]
	}
}, function (pixels: [number, number, number][]) {
	const start = timeUnit(...this.getTime("start"));
	const end = timeUnit(...this.getTime("end"));

	if (!isTimeBetween(start, end)) return;

	const position = this.getNumber("position") + 10;
	const bgColor = this.getColor("bgColor");
	const fgColor = this.getColor("fgColor");

	fillBinaryNumber(pixels, position - 7, 5, bgColor);
	fillBinaryNumber(pixels, position, 6, bgColor);

	const time = getDayTime();
	const hour = Math.floor(getDayTime() / 1000 / 60 / 60);
	writeBinaryNumber(pixels, hour, position - 7, 5, fgColor);
	const minute = Math.floor(time / 1000 / 60) % 60;
	writeBinaryNumber(pixels, minute, position, 6, fgColor);
});

function fillBinaryNumber(pixels: [number, number, number][], position: number, length: number, color: [number, number, number]) {
	for (let i = 0; i < length; i++) {
		pixels[position - i] = [...color];
	}
}

function writeBinaryNumber(pixels: [number, number, number][], value: number, position: number, length: number, color: [number, number, number]) {
	value.toString(2).padStart(length, "0").split("").reverse().map((digit, index) => {
		if (digit === "1") {
			pixels[position - index] = [...color];
		}
	});
}
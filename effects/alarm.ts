import { registerEffect } from "../effect.ts";
import { recallPixel, rememberPixel } from "../pixelMemory.ts";
import { pixelCount } from "../config.ts";
import { playSound } from "../sound.ts";
import { getDayTime, midnightTimestamp, timeUnit } from "../time.ts";

const birdsTypes = ["blackbird", "mountainTailorbird"];
const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const daySettings: { [day: string]: { displayName: string, value: boolean } } = {};

for (const dayName of dayNames) {
	const displayName = (
		dayName[0].toUpperCase() +
		dayName.slice(1, Infinity))
		.padEnd(10, ".");
	daySettings[dayName] = {
		displayName,
		value: true
	};
}

registerEffect("alarm", {
	_activity: {
		displayName: "_activity",
		value: "enabled",
		options: {
			"enabled": "--color-2a",
			"sleeping": "--color-2b",
			"disabled": "--color-2c"
		}
	},
	alarmTime: {
		displayName: "Time",
		value: [7, 0]
	},
	fadeLength: {
		displayName: "Fade (Minutes)",
		value: 10,
		min: 1,
		max: 30,
		step: 1
	},
	...daySettings,
	activePixels: {
		displayName: "LEDs (Max: 50)",
		value: Array(pixelCount).fill(false),
		limit: 50,
	}
}, function (pixels: [number, number, number][]) {
	const dayName = dayNames[new Date().getDay()];

	if (!this.getBoolean(dayName)) return;

	const alarmTime = timeUnit(...this.getTime("alarmTime"));
	const fadeLength = timeUnit(0, Math.max(1, this.getNumber("fadeLength")));
	const halfFadeLength = fadeLength / 2;

	const fadeIn = (getDayTime() - (alarmTime - halfFadeLength)) / fadeLength;
	const fadeOut = (alarmTime + halfFadeLength + timeUnit(0, 1) - getDayTime()) / timeUnit(0, 1);
	const lightProgress = Math.max(0, Math.min(fadeIn, fadeOut)) ** 0.7;

	if (lightProgress <= 0) {
		this.memory.alarmStarted = false;
		this.memory.birdPower = 0;
		return;
	}

	if (fadeOut < fadeIn &&
		lightProgress < 0.5 &&
		this.memory.alarmStarted !== true) {
		playSound("alarm");
		this.memory.alarmStarted = true;
	}

	if (this.memory.alarmStarted !== true) {
		this.memory.birdPower ??= 0;
		this.memory.birdPower += Math.max(0, lightProgress - 0.55) * 0.02;

		if (this.memory.birdPower > 1) {
			this.memory.birdPower -= 1;
			playBirdSound();
		}
	}

	const activePixels = this.getBooleanArray("activePixels");

	for (let i = 0; i < pixels.length; i++) {
		if (activePixels[i]) {
			pixels[i] = alarmEffectPixel(i, lightProgress);
		}
	}
}, function () {
	const alarmTime = timeUnit(...this.getTime("alarmTime"));
	const fadeLength = timeUnit(0, Math.max(1, this.getNumber("fadeLength")));
	const halfFadeLength = fadeLength / 2;
	const endTimestamp = alarmTime + halfFadeLength + midnightTimestamp();

	if (Date.now() >= endTimestamp + timeUnit(0, 1, 1, 0)) {
		return endTimestamp + timeUnit(24, 1, 0, 1);
	} else {
		return endTimestamp + timeUnit(0, 1, 0, 1);
	}
});

function playBirdSound() {
	const bird = birdsTypes[Math.floor(Math.random() * birdsTypes.length)];
	return playSound(bird);
}

function alarmEffectPixel(index: number, lightProgress: number): [number, number, number] {
	let nextTwinkle = recallPixel("alarm:nextTwinkle", index);

	const time = Date.now();

	if (nextTwinkle === null ||
		nextTwinkle - time < -1000 ||
		nextTwinkle - time > 10000) {
		nextTwinkle = time + Math.random() * 6000 + 4000;
	}

	let brightness = 0;
	if (Math.abs(nextTwinkle - time) <= 1000) {
		brightness = Math.cos((nextTwinkle - time) * Math.PI / 2000);
		brightness *= lightProgress;
	}

	rememberPixel("alarm:nextTwinkle", index, nextTwinkle);

	const temperature = 1000 + lightProgress * 5500;
	const [r, g, b] = temperatureToRgb(temperature);

	return [r / 255 * brightness, g / 255 * brightness, b / 255 * brightness];
}

function temperatureToRgb(temperature: number): [number, number, number] {
	temperature = clamp(temperature, 1000, 100000) / 100;

	const red = 255;
	if (temperature > 60) {
		329.698727446 * Math.pow(temperature - 60, -0.1332047592);
	}

	let green = 255;
	if (temperature > 60) {
		green = 288.1221695283 * Math.pow(temperature - 60, -0.0755148492);
	}
	green = Math.min(green, 99.4708025861 * Math.log(temperature) - 161.1195681661);

	const blue = 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;

	return [clamp(red, 0, 255), clamp(green, 0, 255), clamp(blue, 0, 255)];
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}
import { assert, constrain, log } from "./helper.ts";
import { getSettingType } from "./site/shared.js";

const effects: Map<string, Effect> = new Map(),
	effectLibrary: Map<string, { defaultSettings: { [key: string]: Setting }, effectFunc: EffectFunc, wakeupFunc: (this: Effect) => number }> = new Map();

interface BooleanSetting {
	displayName: string;
	value: boolean;
	constant?: boolean;
}

interface NumberSetting {
	displayName: string;
	value: number;
	min?: number;
	max?: number;
	step?: number;
	strict?: boolean;
	constant?: boolean;
}

interface StringSetting {
	displayName: string;
	placeholder?: string;
	value: string;
	constant?: boolean;
}

interface SelectSetting {
	displayName: string;
	value: string;
	options: Record<string, string>;
	constant?: boolean;
}

interface TimeSetting {
	displayName: string;
	value: [number, number];
	constant?: boolean;
}

interface ColorSetting {
	displayName: string;
	value: [number, number, number];
	constant?: boolean;
}

interface BooleanArraySetting {
	displayName: string;
	value: boolean[];
	limit?: number;
	constant?: boolean;
}

type Setting = BooleanSetting | NumberSetting | StringSetting | SelectSetting | TimeSetting | ColorSetting | BooleanArraySetting;

type EffectFunc = (this: Effect, pixels: [number, number, number][]) => void;


interface StateExport {
	effectLib: string[];
	effects: {
		[key: string]: {
			libName: string;
			settings: { [key: string]: Setting };
		}
	}
}



export function exportState() {
	const state: StateExport = {
		effectLib: Array.from(effectLibrary.keys()),
		effects: {}
	};

	for (const [key, effect] of effects) {
		const libName = effect.libName;
		state.effects[key] = {
			libName,
			settings: effect.exportSettings()
		}
	}

	return JSON.stringify(state);
}

export function importState(stateStr: string, force = false) {
	const state = JSON.parse(stateStr) as StateExport;

	if (!force) {
		for (const libName of state.effectLib) {
			if (effectLibrary.has(libName)) continue;
			throw Error(`saved state had (${libName}), but it wasn't found in the effectLibrary`);
		}
	}

	effects.clear();

	for (const displayName in state.effects) {
		const effect = state.effects[displayName];
		if (!effectLibrary.has(effect.libName)) {
			log(`skipped importing (${displayName}) because (${effect.libName}) can't be found in the library`);
			continue;
		}
		createEffect(effect.libName, displayName, effect.settings);
	}

	let newEffects = false;

	for (const libName of effectLibrary.keys()) {
		if (state.effectLib.indexOf(libName) !== -1) continue;
		newEffects = true;
		break;
	}

	if (newEffects) {
		deleteEffect("Manager");
		createEffect("manager", "Manager");
	}
}

export function initState() {
	createEffect("manager", "Manager");
}

export function update(pixels: [number, number, number][]) {
	for (const effect of effects.values()) {
		const activity = effect.getSelect("_activity");

		if (activity === "enabled") {
			effect.update(pixels);
		} else if (activity === "sleeping") {
			effect.sleep();
		}
	}
}

export function getEffectTypes() {
	return Array.from(effectLibrary.keys());
}

export function registerEffect(
	name: string, defaultSettings: { [key: string]: Setting }, effectFunc: EffectFunc,
	wakeupFunc = function (this: Effect) { return Infinity; }) {
	assert(!effectLibrary.has(name));
	effectLibrary.set(name, { defaultSettings, effectFunc, wakeupFunc });
}

export function createEffect(libName: string, displayName: string, applyedSettings: { [key: string]: Setting } = {}) {
	assert(!effects.has(displayName));
	const effect = new Effect(displayName, libName);
	effect.importSettings(applyedSettings);
	effects.set(displayName, effect);

	return effect;
}

export function deleteEffect(displayName: string) {
	effects.delete(displayName);
}

export function exportSettings() {
	const effectConfigs: { [key: string]: { [key: string]: Setting } } = {};

	for (const [displayName, effect] of effects) {
		effectConfigs[displayName] = effect.exportSettings();
	}

	return effectConfigs;
}

export function getChangedWithin(time: number) {
	const arr = [];

	for (const [displayName, effect] of effects) {
		if (effect.lastChanged < Date.now() - time) continue;
		arr.push(displayName);
	}

	return arr;
}

export function importSettings(effectConfigs: any) {
	if (typeof effectConfigs !== "object" ||
		effectConfigs === null) return;

	for (const displayName in effectConfigs) {
		const effectConfig = effectConfigs[displayName];

		if (typeof effectConfig !== "object" ||
			effectConfig === null) continue;

		effects.get(displayName)?.importSettings(effectConfig);
	}
}

class Effect {
	readonly displayName: string;
	readonly libName: string;
	memory: any = {};
	private effectFunc: EffectFunc;
	private wakeupFunc: (this: Effect) => number;
	private settings: Map<string, Setting> = new Map();
	private _lastChanged: number;

	get lastChanged() {
		return this._lastChanged;
	}

	constructor(displayName: string, libName: string) {
		this.displayName = displayName;
		this.libName = libName;
		const effectEntry = effectLibrary.get(this.libName);
		assert(effectEntry !== undefined);
		const { effectFunc, wakeupFunc, defaultSettings } = effectEntry;

		this.effectFunc = effectFunc;
		this.wakeupFunc = wakeupFunc;
		this._lastChanged = Date.now();

		this.settings.set("_activity", {
			displayName: "_activity",
			value: "enabled",
			options: {
				"enabled": "--color-2a",
				"disabled": "--color-2c"
			}
		});

		for (const key in defaultSettings) {
			const setting = this.cleanSetting(defaultSettings[key]);
			assert(setting !== undefined);
			this.settings.set(key, setting);
		}
	}

	update(pixels: [number, number, number][]) {
		return this.effectFunc.call(this, pixels);
	}

	sleep() {
		const wakeupTime = this.wakeupFunc.call(this);
		if (Date.now() >= wakeupTime) {
			const activity = this.settings.get("_activity");
			if (activity && activity.value === "sleeping") {
				activity.value = "enabled";
				this._lastChanged = Date.now();
			}
		}
	}

	exportSettings() {
		const settings: { [key: string]: Setting } = {};

		for (const [key, value] of this.settings) {
			settings[key] = value;
		}

		return settings;
	}

	importSettings(obj: unknown) {
		this._lastChanged = Date.now();

		if (typeof obj !== "object" ||
			obj === null) return;

		for (const [key, setting] of Object.entries(obj)) {

			const currentSetting = this.settings.get(key) as any;
			if (currentSetting === undefined ||
				currentSetting.constant) continue;

			const type = getSettingType(setting);

			if (type !== getSettingType(currentSetting)) continue;

			const cleanSetting = this.cleanSetting(setting, type);
			if (cleanSetting === undefined) continue;

			if (setting.constant !== currentSetting.constant) continue;
			if (setting.displayName !== currentSetting.displayName) continue;

			switch (type) {
				case "number":
					if (setting.min !== currentSetting.min) continue;
					if (setting.max !== currentSetting.max) continue;
					if (setting.step !== currentSetting.step) continue;
					if (setting.strict !== currentSetting.strict) continue;
					break;
				case "string":
					if (setting.placeholder !== currentSetting.placeholder) continue;
					break;
				case "select":
					if (setting.options.length !== currentSetting.options.length) continue;
					for (let i = 0; i < setting.options.length; i++) {
						if (setting.options[i] !== currentSetting.options[i]) continue;
					}
					break;
				case "booleanArray":
					if (setting.limit !== currentSetting.limit) continue;
			}

			this.settings.set(key, cleanSetting);
		}
	}

	getBoolean(name: string) {
		return this.getSetting(name, "boolean") as boolean;
	}

	getNumber(name: string) {
		return this.getSetting(name, "number") as number;
	}

	getString(name: string) {
		return this.getSetting(name, "string") as string;
	}

	getSelect(name: string) {
		return this.getSetting(name, "select") as string;
	}

	getTime(name: string) {
		return this.getSetting(name, "time") as [number, number];
	}

	getColor(name: string) {
		return this.getSetting(name, "color") as [number, number, number];
	}

	getBooleanArray(name: string) {
		return this.getSetting(name, "booleanArray") as boolean[];
	}

	getSetting(name: string, type: "boolean" | "number" | "select" | "string" | "time" | "color" | "booleanArray") {
		const setting = this.getSettingObj(name);
		assert(getSettingType(setting) === type);
		return setting.value;
	}

	assignSettingObj(name: string, obj: Partial<Setting>) {
		Object.assign(this.getSettingObj(name), obj);
		return this;
	}

	getSettingObj(name: string) {
		const setting = this.settings.get(name);
		assert(setting !== undefined);
		return setting;
	}

	private cleanSetting(setting: any,
		type?: "boolean" | "number" | "select" | "string" | "time" | "color" | "booleanArray"): undefined | Setting {
		if (typeof setting !== "object" || setting === null) return undefined;

		if (type === undefined) {
			type = getSettingType(setting);
		}

		if (type === undefined) return undefined;
		if (typeof (setting as any).displayName !== "string") return undefined;

		switch (type) {
			case "boolean":
				return {
					displayName: setting.displayName,
					value: setting.value,
					constant: setting.constant
				}
			case "number": {
				const minType = typeof setting.min,
					maxType = typeof setting.max,
					stepType = typeof setting.step,
					strictType = typeof setting.strict;

				if (minType !== "number" && minType !== "undefined") return undefined;
				if (maxType !== "number" && maxType !== "undefined") return undefined;
				if (stepType !== "number" && stepType !== "undefined") return undefined;
				if (strictType !== "boolean" && strictType !== "undefined") return undefined;

				const
					hasMin = minType === "number",
					hasMax = maxType === "number";
				if ((hasMin && !hasMax) || (!hasMin && hasMax)) return undefined;

				let value = setting.value;

				if (setting.strict) {
					if (!hasMin) return undefined;
					if (typeof stepType === "number") {
						value = Math.round(value / setting.step) * setting.step;
					}
					value = constrain(value, setting.min, setting.max);
				}

				return {
					displayName: setting.displayName,
					value: value,
					min: setting.min,
					max: setting.max,
					step: setting.step,
					strict: setting.strict,
					constant: setting.constant
				}
			} case "string": {
				const value = setting.value.substring(0, 1024);
				return {
					displayName: setting.displayName,
					placeholder: setting.placeholder,
					value,
					constant: setting.constant
				}
			} case "select":
				if (typeof setting.options !== "object") return undefined;
				if (typeof setting.options[setting.value] !== "string") return undefined;

				for (const option in setting.options) {
					if (typeof option !== "string") return undefined;
					if (typeof setting.options[option] !== "string") return undefined;
				}

				return {
					displayName: setting.displayName,
					value: setting.value,
					options: setting.options,
					constant: setting.constant
				}
			case "time": {
				const value = [
					constrain(setting.value[0], 0, 23),
					constrain(setting.value[1], 0, 59)]
				return {
					displayName: setting.displayName,
					value: value as any,
					constant: setting.constant
				}
			} case "color": {
				const value = [
					constrain(setting.value[0], 0, 1),
					constrain(setting.value[1], 0, 1),
					constrain(setting.value[2], 0, 1)];
				return {
					displayName: setting.displayName,
					value: value as any,
					constant: setting.constant
				}
			} case "booleanArray":
				if (typeof setting.limit !== "number") return undefined;

				const total = setting.value
					.reduce((a: boolean, b: boolean) => Number(a) + Number(b));

				if (total > setting.limit) return undefined;

				return {
					displayName: setting.displayName,
					value: Array.from(setting.value) as any,
					limit: setting.limit,
					constant: setting.constant
				}
		}
	}
}
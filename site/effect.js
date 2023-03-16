import { getMainElm, getEffectGridElm, getCSS } from "./ui.js";
import { getSettingType } from "./shared.js";

let effects = new Map();

export function update(configs, changed = null) {
	const oldEffects = effects;
	effects = new Map();

	for (const key in configs) {
		const config = configs[key];

		if (oldEffects.has(key)) {
			const effect = oldEffects.get(key);
			oldEffects.delete(key);

			if (changed === null || changed.has(key)) {
				effect.update(config);
			}

			effects.set(key, effect);
		} else {
			effects.set(key, new Effect(key, config));
		}
	}

	for (const effect of oldEffects.values()) {
		effect.destroyElm();
	}
}

export class Effect {
	constructor(displayName, settings) {
		this.displayName = displayName;
		this.settings = settings;
		this.lockUntil = 0;
		this.delayedUpdateHandle = -1;

		this.elm = document.createElement("div");
		this.elm.classList.add("effectContainer");
		this.elm.draggable = true;
		this.elm.id = `${displayName} Effect Element`;

		this.tabElm = document.createElement("div");
		this.tabElm.classList.add("effectTab");
		this.elm.appendChild(this.tabElm);

		this.nameElm = document.createElement("div");
		this.nameElm.classList.add("effectName");
		this.nameElm.textContent = this.displayName;
		this.nameElm.addEventListener("click", () => {
			if (this.settings._activity.constant) return;

			const activities = Object.keys(this.settings._activity.options);
			const index = (activities.indexOf(this.settings._activity.value) + 1) % activities.length;
			this.settings._activity.value = activities[index];

			this.styleName();
			this.handleChange();
		});
		this.tabElm.appendChild(this.nameElm);

		this.bodyElm = document.createElement("div");
		this.bodyElm.classList.add("effectBody");
		this.makeUndraggable(this.bodyElm);
		this.elm.appendChild(this.bodyElm);

		this.styleName();
		this.buildContent();

		this.appendElm();
	}

	update(settings) {
		clearTimeout(this.delayedUpdateHandle);

		if (Date.now() < this.lockUntil) {
			if (JSON.stringify(this.settings) === JSON.stringify(settings)) return;

			this.delayedUpdateHandle =
				setTimeout(this.update.bind(this, settings), this.lockUntil - Date.now());
			return;
		}

		this.settings = settings;
		this.destroyBody();
		this.buildContent();
		this.styleName();
	}

	handleChange() {
		this.lockUntil = Date.now() + 1200;

		const effects = {};
		effects[this.displayName] = this.settings;

		fetch("effects.json", {
			method: "PUT",
			body: JSON.stringify(effects)
		});
	}

	styleName() {
		const constant = this.settings._activity.constant;
		this.nameElm.style.cursor = constant ? "inherit" : "pointer";

		const cssName = this.settings._activity.options[this.settings._activity.value];
		this.nameElm.style.backgroundColor = getCSS(cssName);
	}

	buildContent() {
		for (const key in this.settings) {
			if (key.startsWith("_")) continue;
			const setting = this.settings[key];
			const type = getSettingType(setting);
			const elm = document.createElement("div");
			const labelElm = document.createElement("div");
			labelElm.textContent = setting.displayName;

			elm.appendChild(labelElm);
			switch (type) {
				case "boolean":
					this.buildBooleanSetting(setting, elm);
					break;
				case "number":
					this.buildNumberSetting(setting, elm);
					break;
				case "string":
					this.buildStringSetting(setting, elm);
					break;
				case "select":
					this.buildSelectSetting(setting, elm);
					break;
				case "time":
					this.buildTimeSetting(setting, elm);
					break;
				case "color":
					this.buildColorSetting(setting, elm);
					break;
				case "booleanArray":
					this.buildBooleanArraySetting(setting, elm);
			}
			this.bodyElm.appendChild(elm);
		}
	}

	buildBooleanSetting(setting, elm) {
		elm.style.display = "flex";

		const inputElm = document.createElement("input");
		inputElm.type = "checkbox";
		inputElm.disabled = setting.constant;

		inputElm.checked = setting.value;
		inputElm.addEventListener("input", () => {
			setting.value = inputElm.checked;
			this.handleChange();
		})

		elm.appendChild(inputElm);
	}

	buildNumberSetting(setting, elm) {
		const containerElm = document.createElement("div");
		containerElm.style.display = "flex";

		const sliderElm = document.createElement("input");
		sliderElm.type = "range";
		sliderElm.style.width = "100px"
		sliderElm.disabled = setting.constant;
		sliderElm.min = setting.min;
		sliderElm.max = setting.max;
		sliderElm.step = setting.step;

		const changeNumber = (value) => {
			if (setting.strict) {
				value = Math.min(setting.max, Math.max(setting.min, value));
				if (setting.step !== undefined) {
					value = Math.round(value / setting.step) * setting.step;
				}
			}

			sliderElm.value = value;
			numberElm.value = value;
			setting.value = value;
			this.handleChange();
		}

		sliderElm.value = setting.value;
		sliderElm.addEventListener("input", () => {
			changeNumber(parseFloat(sliderElm.value));
		});

		const numberElm = document.createElement("input");
		numberElm.type = "number";
		numberElm.style.width = "45px"
		numberElm.disabled = setting.constant;

		numberElm.value = setting.value;
		numberElm.addEventListener("input", () => {
			changeNumber(parseFloat(numberElm.value));
		});

		containerElm.appendChild(sliderElm);
		containerElm.appendChild(numberElm);
		elm.appendChild(containerElm);
	}

	buildStringSetting(setting, elm) {
		const inputElm = document.createElement("input");
		inputElm.type = "text";
		inputElm.placeholder = setting.placeholder || "";
		inputElm.style.width = "150px";
		inputElm.disabled = setting.constant;

		inputElm.value = setting.value;
		inputElm.addEventListener("input", () => {
			setting.value = inputElm.value;
			this.handleChange();
		});

		elm.appendChild(inputElm);
	}

	buildSelectSetting(setting, elm) {
		const selectElm = document.createElement("select");
		selectElm.disabled = setting.constant;

		for (const value in setting.options) {
			const option = document.createElement("option");
			option.innerHTML = setting.options[value];
			option.value = value;
			selectElm.appendChild(option);
		}

		selectElm.value = setting.value;
		selectElm.addEventListener("input", () => {
			setting.value = selectElm.value;
			this.handleChange();
		});

		elm.appendChild(selectElm);
	}

	buildTimeSetting(setting, elm) {
		elm.style.display = "flex";

		const paddingElm = document.createElement("div");
		paddingElm.style.width = "4px";
		elm.appendChild(paddingElm);

		const inputElm = document.createElement("input");
		inputElm.type = "time";
		inputElm.style.width = "80px";
		inputElm.disabled = setting.constant;

		inputElm.value = setting.value
			.map(num => String(num).padStart(2, "0"))
			.join(":");

		inputElm.addEventListener("input", () => {
			setting.value = inputElm.value
				.split(":")
				.map((str) => parseInt(str));
			this.handleChange();
		});

		elm.appendChild(inputElm);
	}

	buildColorSetting(setting, elm) {
		elm.style.display = "flex";

		const paddingElm = document.createElement("div");
		paddingElm.style.width = "4px";
		elm.appendChild(paddingElm);

		const inputElm = document.createElement("input");
		inputElm.type = "color";
		inputElm.style.width = "45px";
		inputElm.style.height = "30px";
		inputElm.disabled = setting.constant;

		inputElm.value = this.colorToHex(setting.value);

		inputElm.addEventListener("input", () => {
			setting.value = this.hexToColor(inputElm.value);
			this.handleChange();
		});

		elm.appendChild(inputElm);
	}

	colorToHex(color) {
		const num =
			color[0] * 16711680 +
			color[1] * 65280 +
			color[2] * 255;
		return "#" + num.toString(16).padStart(6, "0");
	}

	hexToColor(hex) {
		const num = parseInt(hex.substring(1, 7), 16);
		return [
			Math.floor(num / 65536) / 255,
			Math.floor(num / 256) % 256 / 255,
			num % 256 / 255
		]
	}

	buildBooleanArraySetting(setting, elm) {
		const areaElm = document.createElement("textArea");

		areaElm.style.resize = "none";
		areaElm.style.width = "150px";
		areaElm.rows = 4;
		areaElm.style.overflowX = "hidden"; // wtf Mozilla
		areaElm.disabled = setting.constant;

		areaElm.value = this.booleanArrayToStr(setting.value);

		areaElm.addEventListener("change", () => {
			setting.value = this.strToBooleanArray(areaElm.value, setting.value.length, setting.limit);
			areaElm.value = this.booleanArrayToStr(setting.value);
			this.handleChange();
		});

		elm.appendChild(areaElm);
	}

	booleanArrayToStr(arr) {
		let lines = [];

		let runStart = null;
		for (let i = 0; i < arr.length + 1; i++) {
			if (arr[i]) {
				if (runStart === null) runStart = i;
			} else {
				if (runStart !== null) {
					const start = runStart + 1;
					const end = i;

					if (end - start === 0) {
						lines.push(String(start));
					} else {
						lines.push(`${start} - ${end}`);
					}

					runStart = null;
				}
			}
		}

		return lines.join("\n");
	}

	strToBooleanArray(str, length, limit) {
		const arr = new Array(length).fill(false);
		const lines = str.split("\n");
		for (const line of lines) {
			if (line.trim().length === 0) continue;

			const parts = line.split("-");
			if (parts.length === 1) {

				const index = parseInt(parts[0]) - 1;
				if (isNaN(index)) continue;
				if (index < 0 || index >= length) continue;

				arr[index] = true;
			} else if (parts.length === 2) {

				let start = parseInt(parts[0]) - 1;
				let end = parseInt(parts[1]) - 1;
				if (isNaN(start) || isNaN(end)) continue;
				if (start > end) [start, end] = [end, start];
				if (start < 0 || start >= length) continue;
				end = Math.min(length - 1, end);

				for (let i = start; i <= end; i++) {
					arr[i] = true;
				}
			}
		}

		let count = 0;
		return arr.map((value) => {
			if (value) count++;
			if (count > limit) return false;
			return value;
		});
	}

	appendElm() {
		this.elm.visibility = "hidden";
		const mainElm = getMainElm();
		mainElm.appendChild(this.elm);
		const preFixWidth = this.elm.style.width;
		this.elm.style.width = "fit-content";

		const columns = Math.ceil(this.elm.offsetWidth / 170);
		const rows = Math.ceil((this.elm.offsetHeight - 2) / 170);
		this.elm.style.gridArea = `span ${rows} / span ${columns}`;

		mainElm.removeChild(this.elm);
		this.elm.visibility = "visible";
		this.elm.style.width = preFixWidth;
		getEffectGridElm().appendChild(this.elm);
	}

	destroyElm() {
		this.elm.remove();
	}

	destroyBody() {
		this.bodyElm.innerHTML = "";
	}

	makeUndraggable(elm) {
		elm.draggable = true;
		elm.addEventListener("dragstart", function (e) {
			event.preventDefault();
			event.stopPropagation();
		});
	}
}
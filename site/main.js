import { init as initUI } from "./ui.js";
import { update as updateEffects } from "./effect.js";
import { securityCheck } from "./security.js";

async function init() {
	if(!await securityCheck()) return;

	await initUI();

	setTimeout(update, 200);
}

async function update() {
	const changedResponse = await fetch("changedEffects.json");
	const changed = await changedResponse.json();

	if (changed.length > 0) {
		const configsResponse = await fetch("effects.json");
		const configs = await configsResponse.json();
		updateEffects(configs, new Set(changed));
	}

	setTimeout(update, 200);
}

init();
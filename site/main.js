import { init as initUI } from "./ui.js";
import { update as updateEffects } from "./effect.js";
import { getUserPassword } from "./password.js";

async function init() {
	getUserPassword();

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
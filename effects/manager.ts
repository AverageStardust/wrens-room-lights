import { registerEffect, getEffectTypes, createEffect, deleteEffect } from "../effect.ts";

const types = getEffectTypes();
const typeOptions: Record<string, string> = {};
for (const type of types) {
	typeOptions[type] = camelToTitleCase(type);
}

registerEffect("manager", {
	_activity: {
		displayName: "_activity",
		value: "enabled",
		options: {
			"enabled": "--color-2a"
		},
		constant: true
	},
	title: {
		displayName: "Title",
		placeholder: "Untitled",
		value: ""
	},
	type: {
		displayName: "Type",
		options: typeOptions,
		value: types[0]
	},
	create: {
		displayName: "Create",
		value: false
	},
	remove: {
		displayName: "Remove",
		value: false
	}
}, function () {
	let title = this.getString("title").trim();
	if (title.length === 0) title = "Untitled";

	if (this.getBoolean("create")) {
		try {
			createEffect(this.getSelect("type"), title);
		} catch { }

		this.getSettingObj("create").value = false;
	} else if (this.getBoolean("remove")) {
		if (title !== this.displayName) {
			deleteEffect(title);
		}

		this.getSettingObj("remove").value = false;
	}
});

function camelToTitleCase(text: string) {
	text = text.replace(/([A-Z])/g, " $1");
	return text.charAt(0).toUpperCase() + text.slice(1);
}
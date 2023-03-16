export function getSettingType(setting) {
	if (typeof setting !== "object" ||
		setting === null) return undefined;

	const value = (setting).value;

	switch (typeof value) {
		default:
			return undefined;
		case "boolean":
			return "boolean";
		case "number":
			return "number";
		case "string":
			if ("options" in setting) {
				return "select";
			} else {
				return "string";
			}
		case "object":
			if (!Array.isArray(value)) return undefined;
			if (value.length === 2 &&
				typeof value[0] === "number" &&
				typeof value[1] === "number") {
				return "time";
			} else if (value.length === 3 &&
				typeof value[0] === "number" &&
				typeof value[1] === "number" &&
				typeof value[2] === "number") {
				return "color";
			} else if (value.length > 0 &&
				value.map(element => typeof element === "boolean")
					.reduce((a, b) => a && b)) {
				return "booleanArray";
			} else {
				return undefined;
			}
	}
}
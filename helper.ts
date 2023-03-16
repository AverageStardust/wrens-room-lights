export function log(message: string) {
	console.log(`${new Date().toLocaleString()}: ${message}`);
}

export function constrain(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export function assert(condition: boolean): asserts condition {
	if (!condition) throw Error("Assertion failed");
}
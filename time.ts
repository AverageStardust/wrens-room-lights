export function timeUnit(hours: number, minutes = 0, seconds = 0, milliseconds = 0) {
	return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}

export function isTimeBetween(start: number, end: number) {
	const time = getDayTime();
	if (start < end) {
		return time >= start && time <= end;
	} else {
		return time <= end || time >= start;
	}
}

export function getDayTime() {
	const unixTime = Date.now();
	const midnightTime = new Date(unixTime).setHours(0, 0, 0, 0);
	return unixTime - midnightTime;
}

export function midnightTimestamp() {
	const unixTimestamp = Date.now();
	return new Date(unixTimestamp).setHours(0, 0, 0, 0);
}
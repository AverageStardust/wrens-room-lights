const soundTypeTrackCount: Record<string, number> = {
	"alarm": 1,
	"blackbird": 7,
	"mountainTailorbird": 4
};

export async function playSound(type: string, index?: number) {
	const trackCound = soundTypeTrackCount[type];
	if (trackCound === undefined) {
		throw Error(`Failed to play unknown sound type: ${type}`);
	}

	if (index === undefined) {
		index = Math.floor(Math.random() * trackCound);
	} else {
		if (index < 0 || index >= trackCound || index !== Math.floor(index)) {
			throw Error(`Failed to play track (${index}) of sound type ${type}`);
		}
	}

	try {
		const file = `./sounds/${type}${index}.mp3`;
		Deno.run({ cmd: ["mpg123", "-q", file] });
	} catch { };
}
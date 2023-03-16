const pixelMemory: Map<string, any> = new Map();

export function rememberPixel(name: string, index: number, data: any) {
	pixelMemory.set(`${name}|${index}`, data);
}

export function recallPixel(name: string, index: number) {
	return pixelMemory.get(`${name}|${index}`) ?? null;
}
import { lookup } from "https://deno.land/x/mrmime@v1.0.1/mod.ts";
import { load as loadEnv } from "https://deno.land/std@0.180.0/dotenv/mod.ts";
import { assert } from "./helper.ts";
import { exportSettings, getChangedWithin, importSettings } from "./effect.ts";

interface GeneratedFile {
	read?: () => string,
	readProtected?: boolean,
	write?: (body: string) => void,
	writeProtected?: boolean
}

const sitePassword = (await loadEnv())["PASSWORD"].toLowerCase();
const server = Deno.listen({ port: 8088 });
const generatedFiles: Map<string, GeneratedFile> = new Map();
export const networkOptions: Map<string, any> = new Map();

export async function init() {
	generatedFiles.set("/effects.json", {
		read() {
			return JSON.stringify(exportSettings());
		},
		readProtected: true,
		write(file) {
			importSettings(JSON.parse(file));
		},
		writeProtected: true
	});

	generatedFiles.set("/changedEffects.json", {
		read() {
			return JSON.stringify(getChangedWithin(1000));
		},
		readProtected: true,
	});

	generatedFiles.set("/networkOptions.json", {
		write(file) {
			const options = JSON.parse(file);
			for (const key in options) {
				networkOptions.set(key, options[key]);
			}
		},
		writeProtected: true
	});

	for await (const conn of server) serveHttp(conn);
}

export async function serveHttp(conn: Deno.Conn) {
	const httpConn = Deno.serveHttp(conn);
	try {
		for await (const requestEvent of httpConn) {
			serveRequest(requestEvent);
		}
	} catch { }
}

async function serveRequest({ request, respondWith }: Deno.RequestEvent) {
	// const userAgent = request.headers.get("user-agent") ?? "Unknown";
	const url = new URL(request.url);
	let urlpath = decodeURIComponent(url.pathname);

	if (urlpath === "/")
		urlpath = "/index.html";

	const mimeType = lookup(urlpath) ?? "";
	const generatedFile = generatedFiles.get(urlpath);

	if (request.method === "GET") {
		const reader = generatedFile?.read;

		let file: BodyInit;
		if (generatedFile?.read) {
			if (generatedFile?.readProtected) {
				if (!checkRequestProtection({ request, respondWith })) {
					await responseCode(respondWith, 401);
					return;
				}
			}
			try {
				file = generatedFile.read();
			} catch {
				await responseCode(respondWith, 500);
				return;
			}
		} else {
			try {
				file = (await Deno.open("./site" + urlpath, { read: true })).readable;
			} catch {
				await responseCode(respondWith, 404);
				return;
			}
		}

		const response = new Response(file);
		response.headers.append("Content-Type", mimeType);
		try {
			await respondWith(response);
		} catch { }
	} else if (request.method === "PUT") {
		if (generatedFile?.write) {
			if (generatedFile.writeProtected) {
				if (!checkRequestProtection({ request, respondWith })) {
					await responseCode(respondWith, 401);
					return;
				}
			}
			try {
				generatedFile.write(await request.text());
			} catch {
				await responseCode(respondWith, 500);
				return;
			}

			await responseCode(respondWith, 200);
			return;
		}

		try {
			await Deno.open("./site" + urlpath, { read: true });
		} catch {
			await responseCode(respondWith, 404);
			return;
		}

		await responseCode(respondWith, 405);
		return;
	} else {
		await responseCode(respondWith, 400);
	}
}

function checkRequestProtection({ request, respondWith }: Deno.RequestEvent): boolean {
	safePath: {
		const cookies = request.headers.get("Cookie");
		if (cookies === null) break safePath;

		const cookie = cookies
			.split("; ")
			.find((row) => row.startsWith("wrensRoomLightsPassword="));
		if (cookie === undefined) break safePath;

		const cookiePassword = atob(cookie.split("=").splice(1).join(""));
		if (sitePassword !== cookiePassword.toLowerCase()) break safePath;

		return true;
	}

	return false;
}

async function responseCode(respondWith: (r: Response | Promise<Response>) => Promise<void>, status: number) {
	const body = {
		200: "200: OK",
		400: "400: Bad Request",
		401: "401 Unauthorized",
		404: "404: Not Found",
		405: "405: Method Not Allowed",
		500: "500: Internal Server Error"
	}[status];

	assert(body !== undefined);

	try {
		await respondWith(new Response(body, { status }));
	} catch { }
}

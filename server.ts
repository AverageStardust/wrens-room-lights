import { lookup } from "https://deno.land/x/mrmime@v1.0.1/mod.ts";
import { assert } from "./helper.ts";
import { exportSettings, getChangedWithin, importSettings } from "./effect.ts";

const server = Deno.listen({ port: 8088 });
const generatedFiles: Map<string,
	{ read?: () => string, write?: (body: string) => void }> = new Map();
export const networkOptions: Map<string, any> = new Map();

export async function init() {
	generatedFiles.set("/effects.json", {
		read() {
			return JSON.stringify(exportSettings());
		},
		write(file) {
			importSettings(JSON.parse(file));
		}
	});

	generatedFiles.set("/changedEffects.json", {
		read() {
			return JSON.stringify(getChangedWithin(1000));
		}
	});

	generatedFiles.set("/networkOptions.json", {
		write(file) {
			const options = JSON.parse(file);
			for (const key in options) {
				networkOptions.set(key, options[key]);
			}
		}
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

	if (request.method === "GET") {
		const reader = generatedFiles.get(urlpath)?.read;

		let file: BodyInit;
		if (reader) {
			try {
				file = reader();
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
		const writer = generatedFiles.get(urlpath)?.write;
		if (writer) {
			try {
				writer(await request.text());
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

async function responseCode(respondWith: (r: Response | Promise<Response>) => Promise<void>, status: number) {
	const body = {
		200: "200: OK",
		400: "400: Bad Request",
		404: "404: Not Found",
		405: "405: Method Not Allowed",
		500: "500: Internal Server Error"
	}[status];

	assert(body !== undefined);

	try {
		await respondWith(new Response(body, { status }));
	} catch { }
}

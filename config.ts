export const devMode = Deno.build.os !== "linux" || Deno.build.arch !== "aarch64";
export const pixelCount = 200;
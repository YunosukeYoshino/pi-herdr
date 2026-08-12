import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function dirFromUrl(url: string): string {
	return dirname(fileURLToPath(url));
}

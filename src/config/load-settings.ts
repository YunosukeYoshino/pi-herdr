import { existsSync, readFileSync } from "node:fs";
import type { HerdSettings } from "../launch/resolve-launch";

export function loadSettings(path: string): HerdSettings {
	if (!existsSync(path)) {
		return {};
	}

	const parsed = JSON.parse(readFileSync(path, "utf8")) as { herd?: HerdSettings };
	return parsed.herd ?? {};
}

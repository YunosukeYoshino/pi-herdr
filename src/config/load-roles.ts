import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Role } from "../launch/resolve-launch";

export function loadRoles(directory: string): Record<string, Role> {
	const roles: Record<string, Role> = {};
	if (!existsSync(directory)) {
		return roles;
	}

	for (const file of readdirSync(directory)) {
		if (!file.endsWith(".md")) {
			continue;
		}

		const text = readFileSync(join(directory, file), "utf8");
		const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
		if (!frontmatter) {
			continue;
		}

		const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim();
		const model = frontmatter.match(/^model:\s*(.+)$/m)?.[1]?.trim();
		if (!name) {
			continue;
		}

		roles[name] = model ? { name, model } : { name };
	}

	return roles;
}

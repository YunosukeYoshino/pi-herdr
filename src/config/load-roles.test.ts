import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { loadRoles } from "./load-roles";

test("loadRoles reads model from agent markdown frontmatter", async () => {
	const dir = await mkdtemp(join(tmpdir(), "herd-roles-"));
	await writeFile(
		join(dir, "worker.md"),
		`---
name: worker
model: deepseek-v4-pro
---

Implement the assigned task.
`,
	);

	expect(loadRoles(dir)).toEqual({
		worker: { name: "worker", model: "deepseek-v4-pro" },
	});
});

test("loadRoles returns no roles when the directory is missing", () => {
	expect(loadRoles(join(tmpdir(), "herd-roles-missing"))).toEqual({});
});

test("bundled agents include worker and reviewer models", () => {
	expect(loadRoles(join(import.meta.dir, "../..", "agents"))).toEqual({
		worker: { name: "worker", model: "deepseek-v4-flash" },
		reviewer: { name: "reviewer", model: "kimi-k3" },
	});
});

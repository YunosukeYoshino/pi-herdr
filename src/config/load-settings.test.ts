import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { loadSettings } from "./load-settings";

test("loadSettings reads herd overrides from settings.json", async () => {
	const dir = await mkdtemp(join(tmpdir(), "herd-settings-"));
	const path = join(dir, "settings.json");
	await writeFile(
		path,
		JSON.stringify({
			defaultModel: "deepseek-v4-flash",
			herd: {
				defaultModel: "deepseek-v4-pro",
				agentOverrides: {
					reviewer: { model: "anthropic/claude-sonnet-4" },
				},
			},
		}),
	);

	expect(loadSettings(path)).toEqual({
		defaultModel: "deepseek-v4-pro",
		agentOverrides: {
			reviewer: { model: "anthropic/claude-sonnet-4" },
		},
	});
});

test("loadSettings returns empty settings when the file is missing", () => {
	expect(loadSettings(join(tmpdir(), "herd-settings-missing.json"))).toEqual({});
});

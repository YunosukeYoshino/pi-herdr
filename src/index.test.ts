import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import herdExtension, { createHerdExtension } from "./index";
import type { HerdrClient } from "./launch/spawn";

type StartedAgent = {
	name: string;
	kind: "pi";
	paneId: string;
	args: string[];
};

function memoryHerdr(options: { nextPaneId: string }): HerdrClient & {
	agent: (name: string) => StartedAgent | undefined;
	prompt: (name: string) => string | undefined;
} {
	const agents = new Map<string, StartedAgent>();
	const prompts = new Map<string, string>();

	return {
		async splitPane() {
			return { paneId: options.nextPaneId };
		},
		async startAgent(input) {
			agents.set(input.name, input);
		},
		async promptAgent(input) {
			prompts.set(input.name, input.text);
		},
		async getAgent(name) {
			const started = agents.get(name);
			if (!started) {
				throw new Error(`unknown agent ${name}`);
			}
			return { name: started.name, paneId: started.paneId, status: "idle" };
		},
		agent(name) {
			return agents.get(name);
		},
		prompt(name) {
			return prompts.get(name);
		},
	};
}

test("herd_spawn tool starts a herdr agent with the role model", async () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });
	let execute:
		| ((
				toolCallId: string,
				params: { role: string; task: string; model?: string },
		  ) => Promise<unknown>)
		| undefined;

	createHerdExtension(
		{
			registerTool(tool: { name: string; execute: typeof execute }) {
				if (tool.name === "herd_spawn") {
					execute = tool.execute;
				}
			},
		},
		{
			herdr,
			roles: { worker: { name: "worker", model: "deepseek-v4-pro" } },
			parentModel: "deepseek-v4-flash",
		},
	);

	const spawned = (await execute?.("call-1", { role: "worker", task: "implement the parser" })) as {
		details: { name: string };
	};

	expect(herdr.agent(spawned.details.name)).toEqual({
		name: spawned.details.name,
		kind: "pi",
		paneId: "w1:p2",
		args: ["--model", "deepseek-v4-pro"],
	});
});

test("herd_spawn uses the session model when the role has no model", async () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });
	let execute:
		| ((
				toolCallId: string,
				params: { role: string; task: string; model?: string },
				signal?: unknown,
				onUpdate?: unknown,
				ctx?: { model?: { id: string } },
		  ) => Promise<unknown>)
		| undefined;

	createHerdExtension(
		{
			registerTool(tool: { name: string; execute: typeof execute }) {
				if (tool.name === "herd_spawn") {
					execute = tool.execute;
				}
			},
		},
		{
			herdr,
			roles: { worker: { name: "worker" } },
		},
	);

	const spawned = (await execute?.(
		"call-1",
		{ role: "worker", task: "implement the parser" },
		undefined,
		undefined,
		{
			model: { id: "deepseek-v4-flash" },
		},
	)) as { details: { name: string } };

	expect(herdr.agent(spawned.details.name)?.args).toEqual(["--model", "deepseek-v4-flash"]);
});

test("herd_spawn uses the model from role markdown in agentsDir", async () => {
	const dir = await mkdtemp(join(tmpdir(), "herd-agents-"));
	await writeFile(
		join(dir, "reviewer.md"),
		`---
name: reviewer
model: anthropic/claude-sonnet-4
---
`,
	);

	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });
	let execute:
		| ((
				toolCallId: string,
				params: { role: string; task: string; model?: string },
		  ) => Promise<unknown>)
		| undefined;

	herdExtension(
		{
			registerTool(tool: { name: string; execute: typeof execute }) {
				if (tool.name === "herd_spawn") {
					execute = tool.execute;
				}
			},
		},
		{ herdr, agentsDir: dir },
	);

	const spawned = (await execute?.("call-1", { role: "reviewer", task: "review the parser" })) as {
		details: { name: string };
	};

	expect(herdr.agent(spawned.details.name)?.args).toEqual(["--model", "anthropic/claude-sonnet-4"]);
});

test("herd_status reports the spawned agent state", async () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });
	const tools = new Map<string, (id: string, params: Record<string, string>) => Promise<unknown>>();

	createHerdExtension(
		{
			registerTool(tool: {
				name: string;
				execute: (id: string, params: Record<string, string>) => Promise<unknown>;
			}) {
				tools.set(tool.name, tool.execute);
			},
		},
		{
			herdr,
			roles: { worker: { name: "worker", model: "deepseek-v4-pro" } },
		},
	);

	const spawned = (await tools.get("herd_spawn")?.("call-1", {
		role: "worker",
		task: "implement the parser",
	})) as { details: { name: string } };

	const status = (await tools.get("herd_status")?.("call-2", { name: spawned.details.name })) as {
		details: { name: string; status: string; paneId: string };
	};

	expect(status.details).toEqual({
		name: spawned.details.name,
		status: "idle",
		paneId: "w1:p2",
	});
});

test("herd_steer prompts the spawned agent", async () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });
	const tools = new Map<string, (id: string, params: Record<string, string>) => Promise<unknown>>();

	createHerdExtension(
		{
			registerTool(tool: {
				name: string;
				execute: (id: string, params: Record<string, string>) => Promise<unknown>;
			}) {
				tools.set(tool.name, tool.execute);
			},
		},
		{
			herdr,
			roles: { worker: { name: "worker", model: "deepseek-v4-pro" } },
		},
	);

	const spawned = (await tools.get("herd_spawn")?.("call-1", {
		role: "worker",
		task: "implement the parser",
	})) as { details: { name: string } };

	await tools.get("herd_steer")?.("call-2", {
		name: spawned.details.name,
		message: "also add tests",
	});

	expect(herdr.prompt(spawned.details.name)).toBe("also add tests");
});

test("herd_spawn is listed in the system prompt with available roles", () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });
	let spawn: { promptSnippet?: string; promptGuidelines?: string[] } | undefined;

	createHerdExtension(
		{
			registerTool(tool: { name: string; promptSnippet?: string; promptGuidelines?: string[] }) {
				if (tool.name === "herd_spawn") {
					spawn = tool;
				}
			},
		},
		{
			herdr,
			roles: { worker: { name: "worker", model: "deepseek-v4-pro" } },
		},
	);

	expect(spawn?.promptSnippet).toBe(
		"Spawn a Pi subagent in a Herdr pane. Roles: worker (deepseek-v4-pro).",
	);
	expect(spawn?.promptGuidelines?.[0]).toContain("call herd_spawn immediately");
});

test("/herd tells the parent to call herd_spawn with the given role and task", async () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });
	let handler: ((args: string) => Promise<void>) | undefined;
	let sent: string | undefined;

	createHerdExtension(
		{
			registerTool() {},
			registerCommand(_name, options) {
				handler = options.handler;
			},
			sendUserMessage(content) {
				sent = content;
			},
		},
		{
			herdr,
			roles: { worker: { name: "worker", model: "deepseek-v4-pro" } },
		},
	);

	await handler?.("worker fix the README typo");

	expect(sent).toBe(
		'Call herd_spawn now with role "worker" and task "fix the README typo". Do not do the work yourself. Do not ask what the role means.',
	);
});

test("herd_spawn uses settings.json herd overrides", async () => {
	const dir = await mkdtemp(join(tmpdir(), "herd-settings-"));
	const settingsPath = join(dir, "settings.json");
	await writeFile(
		settingsPath,
		JSON.stringify({
			herd: {
				agentOverrides: {
					reviewer: { model: "anthropic/claude-sonnet-4" },
				},
			},
		}),
	);

	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });
	let execute:
		| ((
				toolCallId: string,
				params: { role: string; task: string; model?: string },
		  ) => Promise<unknown>)
		| undefined;

	herdExtension(
		{
			registerTool(tool: { name: string; execute: typeof execute }) {
				if (tool.name === "herd_spawn") {
					execute = tool.execute;
				}
			},
		},
		{
			herdr,
			agentsDir: join(dir, "missing-agents"),
			settingsPath,
		},
	);

	const spawned = (await execute?.("call-1", { role: "reviewer", task: "review the parser" })) as {
		details: { name: string };
	};

	expect(herdr.agent(spawned.details.name)?.args).toEqual(["--model", "anthropic/claude-sonnet-4"]);
});

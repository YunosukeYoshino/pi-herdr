import { expect, test } from "bun:test";
import { spawn, type HerdrClient } from "./spawn";

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

test("spawn starts a pi agent in a new pane with the resolved model", async () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });

	const result = await spawn({ role: "worker", model: "deepseek-v4-pro", id: "a1b2c3d4" }, herdr);

	expect(herdr.agent(result.name)).toEqual({
		name: "worker-a1b2c3d4",
		kind: "pi",
		paneId: "w1:p2",
		args: ["--model", "deepseek-v4-pro"],
	});
});

test("spawn prompts the started agent with the task", async () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });

	const result = await spawn(
		{ role: "worker", model: "deepseek-v4-pro", task: "implement the parser", id: "a1b2c3d4" },
		herdr,
	);

	expect(herdr.prompt(result.name)).toBe("implement the parser");
});

test("spawn uses a unique herdr agent name", async () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });

	const result = await spawn(
		{ role: "worker", model: "deepseek-v4-pro", id: "a1b2c3d4" },
		herdr,
	);

	expect(result).toEqual({ name: "worker-a1b2c3d4" });
	expect(herdr.agent("worker-a1b2c3d4")).toEqual({
		name: "worker-a1b2c3d4",
		kind: "pi",
		paneId: "w1:p2",
		args: ["--model", "deepseek-v4-pro"],
	});
});

test("spawn generates a unique name when id is omitted", async () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });

	const first = await spawn({ role: "worker", model: "deepseek-v4-pro" }, herdr);
	const second = await spawn({ role: "worker", model: "deepseek-v4-pro" }, herdr);

	expect(first.name.startsWith("worker-")).toBe(true);
	expect(second.name.startsWith("worker-")).toBe(true);
	expect(first.name).not.toBe(second.name);
});

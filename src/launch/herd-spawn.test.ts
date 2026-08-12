import { expect, test } from "bun:test";
import { herdSpawn } from "./herd-spawn";
import type { HerdrClient } from "./spawn";

type StartedAgent = {
	name: string;
	kind: "pi";
	paneId: string;
	args: string[];
};

function memoryHerdr(options: { nextPaneId: string }): HerdrClient & {
	agent: (name: string) => StartedAgent | undefined;
} {
	const agents = new Map<string, StartedAgent>();

	return {
		async splitPane() {
			return { paneId: options.nextPaneId };
		},
		async startAgent(input) {
			agents.set(input.name, input);
		},
		async promptAgent() {},
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
	};
}

test("herdSpawn starts the agent with the resolved role model", async () => {
	const herdr = memoryHerdr({ nextPaneId: "w1:p2" });

	const result = await herdSpawn(
		{ role: "worker", task: "implement the parser", id: "a1b2c3d4" },
		{
			herdr,
			roles: { worker: { name: "worker", model: "deepseek-v4-pro" } },
			parentModel: "deepseek-v4-flash",
		},
	);

	expect(result).toEqual({ name: "worker-a1b2c3d4" });
	expect(herdr.agent("worker-a1b2c3d4")).toEqual({
		name: "worker-a1b2c3d4",
		kind: "pi",
		paneId: "w1:p2",
		args: ["--model", "deepseek-v4-pro"],
	});
});

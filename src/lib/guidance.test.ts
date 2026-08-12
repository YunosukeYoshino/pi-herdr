import { expect, test } from "bun:test";
import { herdGuidance } from "./guidance";

test("herdGuidance names worker as a herd_spawn role", () => {
	const guidance = herdGuidance({
		worker: { name: "worker", model: "deepseek-v4-pro" },
	});

	expect(guidance.snippet).toBe(
		"Spawn a Pi subagent in a Herdr pane. Roles: worker (deepseek-v4-pro).",
	);
	expect(guidance.guidelines).toEqual([
		"When the user asks to spawn, start, delegate to, or use a Herd role (worker), call herd_spawn immediately. Those names are Herd roles, not project concepts. Do not ask what they mean.",
		"Put the user's actual work in herd_spawn.task. Do not do that work yourself unless they asked you to.",
		"Prefer herd_spawn over the subagent tool. After spawn, tell the user the returned agent name. Use herd_steer to follow up and herd_status to check progress.",
	]);
});

import { expect, test } from "bun:test";
import { resolveLaunch } from "./resolve-launch";

test("per-run model override wins over role frontmatter", () => {
	const plan = resolveLaunch({
		role: "worker",
		task: "implement the parser",
		model: "anthropic/claude-sonnet-4",
		parentModel: "deepseek-v4-flash",
		roles: {
			worker: { name: "worker", model: "deepseek-v4-pro" },
		},
	});

	expect(plan.model).toBe("anthropic/claude-sonnet-4");
});

test("role frontmatter model is used when per-run model is omitted", () => {
	const plan = resolveLaunch({
		role: "worker",
		task: "implement the parser",
		parentModel: "deepseek-v4-flash",
		roles: {
			worker: { name: "worker", model: "deepseek-v4-pro" },
		},
	});

	expect(plan.model).toBe("deepseek-v4-pro");
});

test("settings agentOverrides model is used when role has no model", () => {
	const plan = resolveLaunch({
		role: "reviewer",
		task: "review the parser",
		parentModel: "deepseek-v4-flash",
		roles: {
			reviewer: { name: "reviewer" },
		},
		settings: {
			agentOverrides: {
				reviewer: { model: "anthropic/claude-sonnet-4" },
			},
		},
	});

	expect(plan.model).toBe("anthropic/claude-sonnet-4");
});

test("role frontmatter wins over settings agentOverrides", () => {
	const plan = resolveLaunch({
		role: "worker",
		task: "implement the parser",
		roles: {
			worker: { name: "worker", model: "deepseek-v4-pro" },
		},
		settings: {
			agentOverrides: {
				worker: { model: "anthropic/claude-sonnet-4" },
			},
		},
	});

	expect(plan.model).toBe("deepseek-v4-pro");
});

test("settings defaultModel is used when role and overrides have no model", () => {
	const plan = resolveLaunch({
		role: "scout",
		task: "map the auth flow",
		parentModel: "anthropic/claude-sonnet-4",
		roles: {
			scout: { name: "scout" },
		},
		settings: {
			defaultModel: "deepseek-v4-flash",
		},
	});

	expect(plan.model).toBe("deepseek-v4-flash");
});

test("parent session model is used when nothing else sets a model", () => {
	const plan = resolveLaunch({
		role: "delegate",
		task: "summarize findings",
		parentModel: "deepseek-v4-flash",
		roles: {
			delegate: { name: "delegate" },
		},
	});

	expect(plan.model).toBe("deepseek-v4-flash");
});

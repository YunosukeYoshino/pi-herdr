import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { createHerdrCli, herdrProcessRunner } from "./adapter";

const paneSplitResponse = {
	id: "cli:pane:split",
	result: {
		type: "pane_split",
		pane: {
			pane_id: "w1:p2",
			tab_id: "w1:t1",
			workspace_id: "w1",
			cwd: "/workspace/app",
			focused: false,
		},
	},
};

async function writeFakeHerdr(stdout: string): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "herd-"));
	const command = join(dir, "herdr");
	await writeFile(command, `#!/bin/sh\nprintf '%s\\n' '${stdout}'\n`);
	await chmod(command, 0o755);
	return command;
}

test("splitPane returns the pane id from herdr JSON", async () => {
	const herdr = createHerdrCli({
		run: async () => JSON.stringify(paneSplitResponse),
	});

	expect(await herdr.splitPane()).toEqual({ paneId: "w1:p2" });
});

test("startAgent runs herdr agent start with kind, pane, and model args", async () => {
	let argv: readonly string[] = [];
	const herdr = createHerdrCli({
		run: async (received) => {
			argv = received;
			return JSON.stringify({ result: { type: "agent_started" } });
		},
	});

	await herdr.startAgent({
		name: "worker",
		kind: "pi",
		paneId: "w1:p2",
		args: ["--model", "deepseek-v4-pro"],
	});

	expect(argv).toEqual([
		"agent",
		"start",
		"worker",
		"--kind",
		"pi",
		"--pane",
		"w1:p2",
		"--",
		"--model",
		"deepseek-v4-pro",
	]);
});

test("promptAgent runs herdr agent prompt with wait", async () => {
	let argv: readonly string[] = [];
	const herdr = createHerdrCli({
		run: async (received) => {
			argv = received;
			return JSON.stringify({ result: { type: "agent_prompt" } });
		},
	});

	await herdr.promptAgent({
		name: "worker",
		text: "implement the parser",
	});

	expect(argv).toEqual(["agent", "prompt", "worker", "implement the parser", "--wait"]);
});

test("getAgent returns name pane and status from herdr JSON", async () => {
	let argv: readonly string[] = [];
	const herdr = createHerdrCli({
		run: async (received) => {
			argv = received;
			return JSON.stringify({
				result: {
					type: "agent_info",
					agent: {
						name: "worker-a1b2c3d4",
						pane_id: "w1:p2",
						agent_status: "idle",
						terminal_id: "term_1",
						workspace_id: "w1",
						tab_id: "w1:t1",
						focused: false,
						revision: 1,
					},
				},
			});
		},
	});

	const agent = await herdr.getAgent("worker-a1b2c3d4");

	expect(argv).toEqual(["agent", "get", "worker-a1b2c3d4"]);
	expect(agent).toEqual({
		name: "worker-a1b2c3d4",
		paneId: "w1:p2",
		status: "idle",
	});
});

test("splitPane passes cwd to herdr", async () => {
	let argv: readonly string[] = [];
	const herdr = createHerdrCli({
		run: async (received) => {
			argv = received;
			return JSON.stringify(paneSplitResponse);
		},
	});

	await herdr.splitPane({ cwd: "/workspace/app" });

	expect(argv).toEqual([
		"pane",
		"split",
		"--current",
		"--direction",
		"right",
		"--no-focus",
		"--cwd",
		"/workspace/app",
	]);
});

test("herdrProcessRunner throws when herdr exits non-zero", async () => {
	const dir = await mkdtemp(join(tmpdir(), "herd-"));
	const command = join(dir, "herdr");
	await writeFile(command, "#!/bin/sh\nprintf '%s\\n' 'boom' >&2\nexit 1\n");
	await chmod(command, 0o755);

	await expect(herdrProcessRunner(command).run(["agent", "get", "worker"])).rejects.toThrow("boom");
});

test("herdrProcessRunner returns stdout from the herdr command", async () => {
	const command = await writeFakeHerdr(JSON.stringify(paneSplitResponse));
	const runner = herdrProcessRunner(command);

	const stdout = await runner.run(["pane", "split", "--current"]);

	expect(JSON.parse(stdout).result.pane.pane_id).toBe("w1:p2");
});

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { HerdrClient } from "../launch/spawn";

const execFileAsync = promisify(execFile);

export type HerdrCommandRunner = {
	run: (argv: readonly string[]) => Promise<string>;
};

export function herdrProcessRunner(command = "herdr"): HerdrCommandRunner {
	return {
		async run(argv) {
			try {
				const { stdout } = await execFileAsync(command, [...argv], { encoding: "utf8" });
				return stdout;
			} catch (err) {
				const error = err as { stderr?: string; message: string };
				throw new Error(error.stderr?.trim() || error.message);
			}
		},
	};
}

export function createHerdrCli(runner: HerdrCommandRunner): HerdrClient {
	return {
		async splitPane(input) {
			const argv = [
				"pane",
				"split",
				"--current",
				"--direction",
				"right",
				"--no-focus",
			];
			if (input?.cwd) {
				argv.push("--cwd", input.cwd);
			}
			const stdout = await runner.run(argv);
			const parsed = JSON.parse(stdout) as {
				result: { pane: { pane_id: string } };
			};
			return { paneId: parsed.result.pane.pane_id };
		},
		async startAgent(input) {
			await runner.run([
				"agent",
				"start",
				input.name,
				"--kind",
				input.kind,
				"--pane",
				input.paneId,
				"--",
				...input.args,
			]);
		},
		async promptAgent(input) {
			await runner.run([
				"agent",
				"prompt",
				input.name,
				input.text,
				"--wait",
			]);
		},
		async getAgent(name) {
			const stdout = await runner.run(["agent", "get", name]);
			const parsed = JSON.parse(stdout) as {
				result: {
					agent: {
						name: string | null;
						pane_id: string;
						agent_status: string;
					};
				};
			};
			return {
				name: parsed.result.agent.name ?? name,
				paneId: parsed.result.agent.pane_id,
				status: parsed.result.agent.agent_status,
			};
		},
	};
}

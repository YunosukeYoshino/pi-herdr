import { homedir } from "node:os";
import { join } from "node:path";
import { Type } from "typebox";
import { herdGuidance } from "./lib/guidance";
import { createHerdrCli, herdrProcessRunner } from "./herdr/adapter";
import { herdSpawn, type HerdSpawnDeps } from "./launch/herd-spawn";
import { loadRoles } from "./config/load-roles";
import { loadSettings } from "./config/load-settings";
import { dirFromUrl } from "./lib/paths";

type ExtensionContext = {
	model?: { id: string; provider?: string };
};

type ToolResult = {
	content: Array<{ type: "text"; text: string }>;
	details: Record<string, string>;
};

type HerdTool = {
	name: string;
	label: string;
	description: string;
	promptSnippet?: string;
	promptGuidelines?: string[];
	parameters: unknown;
	execute: (
		toolCallId: string,
		params: Record<string, string>,
		signal?: unknown,
		onUpdate?: unknown,
		ctx?: ExtensionContext,
	) => Promise<ToolResult>;
};

function sessionModel(ctx?: ExtensionContext): string | undefined {
	if (!ctx?.model?.id) {
		return undefined;
	}
	return ctx.model.provider ? `${ctx.model.provider}/${ctx.model.id}` : ctx.model.id;
}

type Pi = {
	registerTool: (tool: HerdTool) => void;
	registerCommand?: (
		name: string,
		options: { description: string; handler: (args: string) => Promise<void> },
	) => void;
	sendUserMessage?: (content: string) => void;
};

export function createHerdExtension(pi: Pi, deps: HerdSpawnDeps): void {
	const guidance = herdGuidance(deps.roles);
	const roleNames = Object.keys(deps.roles).join(", ") || "worker, reviewer";

	pi.registerCommand?.("herd", {
		description: `Spawn a Herd role in a Herdr pane. Usage: /herd <role> <task>. Roles: ${roleNames}`,
		async handler(args) {
			const trimmed = args.trim();
			const space = trimmed.indexOf(" ");
			const role = space === -1 ? trimmed : trimmed.slice(0, space);
			const task = space === -1 ? "" : trimmed.slice(space + 1).trim();
			if (!role || !task) {
				pi.sendUserMessage?.(
					`Call herd_spawn. Available roles: ${roleNames}. Ask the user for the role and task if missing.`,
				);
				return;
			}
			pi.sendUserMessage?.(
				`Call herd_spawn now with role "${role}" and task ${JSON.stringify(task)}. Do not do the work yourself. Do not ask what the role means.`,
			);
		},
	});

	pi.registerTool({
		name: "herd_spawn",
		label: "Herd Spawn",
		description: `Spawn a Pi subagent in a Herdr pane. Available roles: ${roleNames}. Use this when the user names a role such as worker or reviewer.`,
		promptSnippet: guidance.snippet,
		promptGuidelines: guidance.guidelines,
		parameters: Type.Object({
			role: Type.String({
				description: `Herd role to spawn. Available: ${roleNames}`,
			}),
			task: Type.String({ description: "Task for the subagent" }),
			model: Type.Optional(Type.String({ description: "Optional per-run model override" })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const result = await herdSpawn(
				{ role: params.role, task: params.task, model: params.model },
				{
					...deps,
					parentModel: deps.parentModel ?? sessionModel(ctx),
				},
			);
			return {
				content: [{ type: "text", text: `Spawned ${result.name}` }],
				details: { name: result.name },
			};
		},
	});

	pi.registerTool({
		name: "herd_status",
		label: "Herd Status",
		description: "Get the Herdr status of a spawned subagent",
		promptSnippet: "Check a Herd subagent's pane status by the name returned from herd_spawn.",
		parameters: Type.Object({
			name: Type.String({ description: "Herdr agent name from herd_spawn" }),
		}),
		async execute(_toolCallId, params) {
			const agent = await deps.herdr.getAgent(params.name);
			return {
				content: [
					{
						type: "text",
						text: `${agent.name} is ${agent.status} in ${agent.paneId}`,
					},
				],
				details: {
					name: agent.name,
					status: agent.status,
					paneId: agent.paneId,
				},
			};
		},
	});

	pi.registerTool({
		name: "herd_steer",
		label: "Herd Steer",
		description: "Send a follow-up message to a spawned subagent",
		promptSnippet: "Send a follow-up message to a running Herd subagent by name.",
		parameters: Type.Object({
			name: Type.String({ description: "Herdr agent name from herd_spawn" }),
			message: Type.String({ description: "Follow-up instructions" }),
		}),
		async execute(_toolCallId, params) {
			await deps.herdr.promptAgent({ name: params.name, text: params.message });
			return {
				content: [{ type: "text", text: `Steered ${params.name}` }],
				details: { name: params.name },
			};
		},
	});
}

export default function (
	pi: Pi,
	options: {
		herdr?: HerdSpawnDeps["herdr"];
		agentsDir?: string;
		settingsPath?: string;
		parentModel?: string;
	} = {},
): void {
	createHerdExtension(pi, {
		herdr: options.herdr ?? createHerdrCli(herdrProcessRunner()),
		roles: loadRoles(options.agentsDir ?? join(dirFromUrl(import.meta.url), "..", "agents")),
		settings: loadSettings(
			options.settingsPath ?? join(homedir(), ".pi/agent/settings.json"),
		),
		parentModel: options.parentModel,
	});
}

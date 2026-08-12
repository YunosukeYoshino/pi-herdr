import type { Role } from "../launch/resolve-launch";

export function herdGuidance(roles: Record<string, Role>): {
	snippet: string;
	guidelines: string[];
} {
	const names = Object.keys(roles);
	const roleList =
		names.length > 0
			? names
					.map((name) => {
						const model = roles[name]?.model;
						return model ? `${name} (${model})` : name;
					})
					.join(", ")
			: "(none)";

	return {
		snippet: `Spawn a Pi subagent in a Herdr pane. Roles: ${roleList}.`,
		guidelines: [
			`When the user asks to spawn, start, delegate to, or use a Herd role (${names.join(", ") || "any role"}), call herd_spawn immediately. Those names are Herd roles, not project concepts. Do not ask what they mean.`,
			"Put the user's actual work in herd_spawn.task. Do not do that work yourself unless they asked you to.",
			"Prefer herd_spawn over the subagent tool. After spawn, tell the user the returned agent name. Use herd_steer to follow up and herd_status to check progress.",
		],
	};
}

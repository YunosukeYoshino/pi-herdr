import { resolveLaunch, type HerdSettings, type Role } from "./resolve-launch";
import { spawn, type HerdrClient } from "./spawn";

export type HerdSpawnInput = {
	role: string;
	task: string;
	model?: string;
	id?: string;
};

export type HerdSpawnDeps = {
	herdr: HerdrClient;
	roles: Record<string, Role>;
	settings?: HerdSettings;
	parentModel?: string;
};

export async function herdSpawn(input: HerdSpawnInput, deps: HerdSpawnDeps) {
	const plan = resolveLaunch({
		role: input.role,
		task: input.task,
		model: input.model,
		parentModel: deps.parentModel,
		roles: deps.roles,
		settings: deps.settings,
	});

	return spawn(
		{
			role: input.role,
			model: plan.model,
			task: input.task,
			id: input.id,
		},
		deps.herdr,
	);
}

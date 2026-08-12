export type Role = {
	name: string;
	model?: string;
};

export type HerdSettings = {
	defaultModel?: string;
	agentOverrides?: Record<string, { model?: string }>;
};

export type ResolveLaunchInput = {
	role: string;
	task: string;
	model?: string;
	parentModel?: string;
	roles: Record<string, Role>;
	settings?: HerdSettings;
};

export type LaunchPlan = {
	model: string;
};

export function resolveLaunch(input: ResolveLaunchInput): LaunchPlan {
	return {
		model:
			input.model ??
			input.roles[input.role]?.model ??
			input.settings?.agentOverrides?.[input.role]?.model ??
			input.settings?.defaultModel ??
			input.parentModel!,
	};
}

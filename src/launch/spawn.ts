export type HerdrClient = {
	splitPane: (input?: { cwd?: string }) => Promise<{ paneId: string }>;
	startAgent: (input: {
		name: string;
		kind: "pi";
		paneId: string;
		args: string[];
	}) => Promise<void>;
	promptAgent: (input: { name: string; text: string }) => Promise<void>;
	getAgent: (name: string) => Promise<{
		name: string;
		paneId: string;
		status: string;
	}>;
};

export type SpawnInput = {
	role: string;
	model: string;
	task?: string;
	id?: string;
};

export type SpawnResult = {
	name: string;
};

export function agentName(role: string, id?: string): string {
	const suffix = (id ?? crypto.randomUUID().replaceAll("-", "")).toLowerCase().slice(0, 8);
	return `${role}-${suffix}`.slice(0, 32);
}

export async function spawn(input: SpawnInput, herdr: HerdrClient): Promise<SpawnResult> {
	const name = agentName(input.role, input.id);
	const { paneId } = await herdr.splitPane({ cwd: process.cwd() });
	await herdr.startAgent({
		name,
		kind: "pi",
		paneId,
		args: ["--model", input.model],
	});
	if (input.task) {
		await herdr.promptAgent({ name, text: input.task });
	}
	return { name };
}

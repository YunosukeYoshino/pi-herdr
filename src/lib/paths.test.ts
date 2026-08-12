import { expect, test } from "bun:test";
import { dirFromUrl } from "./paths";

test("dirFromUrl returns the file's directory", () => {
	expect(dirFromUrl("file:///Users/yoshinoyuunosuke/.pi/agent/extensions/herd/index.ts")).toBe(
		"/Users/yoshinoyuunosuke/.pi/agent/extensions/herd",
	);
});

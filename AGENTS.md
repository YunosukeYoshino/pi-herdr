# @yunosukeyoshino/pi-herdr

Layout follows `small-cli-package`. Implementation lives under `src/` grouped by duty: `launch/`, `herdr/`, `config/`, `lib/`. Tests colocated as `*.test.ts`.

Pi auto-discovery and `pi.extensions` both load root `index.ts`, which re-exports `src/index.ts`. Keep that root file. Role markdown stays in `agents/` next to the package root.

Directory architecture norms: `~/.agents/skills/directory-architecture/references/instructions.md`.

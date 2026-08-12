# @yunosukeyoshino/pi-herdr

Spawn a Pi subagent in a neighboring [Herdr](https://herdr.dev) pane, with a model chosen per role. The parent Pi keeps its full toolset. Children run as real `pi` processes you can watch and steer.

## Getting Started

```bash
pi install npm:@yunosukeyoshino/pi-herdr
pi install git:github.com/YunosukeYoshino/pi-herdr
```

Requires [Pi](https://pi.dev) and [Herdr](https://herdr.dev). The parent `pi` must run **inside a Herdr pane** (`HERDR_ENV=1`) so `herdr pane split` can create a sibling.

## Usage

Inside Herdr, start Pi and either talk to it or use the slash command:

```
/herd worker fix the README typo
```

```
Have worker implement the current TODOs
```

```
Have reviewer review the current git diff. Do not implement.
```

The parent calls `herd_spawn`, splits a pane to the right, starts `pi` with the role's model, and prompts it with the task. It returns a unique Herdr agent name such as `worker-a1b2c3d4`.

Follow up with that name:

```
Tell worker-a1b2c3d4 to add tests too
```

```
What's the status of worker-a1b2c3d4?
```

| Tool | What it does |
| --- | --- |
| `herd_spawn` | Split a pane, start Pi, send the task |
| `herd_steer` | Send a follow-up prompt to a spawned agent |
| `herd_status` | Read Herdr status (`idle`, `working`, `blocked`, …) |

`herd_spawn` waits until the child settles, then returns the agent name. It does not currently return the child's transcript; look at the pane, or ask the parent to `herd_status` / `herd_steer`.

This package is not a general Herdr controller. Other `pi-herdr` packages exist for layout, tab chrome, or transcript mirrors. This one only spawns role-based Pi children.

It can sit next to `npm:pi-subagents`. Prefer `herd_spawn` when you want a **visible Herdr pane**. The `subagent` tool is a headless Pi process.

## Roles

Bundled roles live in `agents/`:

| Role | Default model | Intended job |
| --- | --- | --- |
| `worker` | `deepseek-v4-pro` | Implement the task |
| `reviewer` | `anthropic/claude-sonnet-4` | Review only |

Add another role by dropping `agents/<name>.md` at the package root (next to `index.ts`):

```markdown
---
name: researcher
model: deepseek-v4-flash
---
```

Only `name` and `model` in the frontmatter are read today. The markdown body is not sent to the child.

## Model precedence

Strongest first:

1. Per-run `model` on `herd_spawn`
2. Role frontmatter `model`
3. `settings.json` → `herd.agentOverrides.<role>.model`
4. `settings.json` → `herd.defaultModel`
5. The parent session model

Optional `~/.pi/agent/settings.json`:

```json
{
  "herd": {
    "defaultModel": "deepseek-v4-flash",
    "agentOverrides": {
      "reviewer": { "model": "anthropic/claude-sonnet-4" }
    }
  }
}
```

## Structure

```txt
.
  index.ts                 # Pi entry — re-exports src/index.ts
  src/
    index.ts               # herd_spawn, herd_steer, herd_status, /herd
    launch/                # model resolve + pane spawn
    herdr/                 # herdr CLI adapter
    config/                # roles + settings.json
    lib/
  agents/                  # role markdown (name + model)
```

Tests live next to the source as `*.test.ts`.

## Development

```bash
bun test
```

## License

MIT

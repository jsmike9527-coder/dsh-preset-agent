# Mode Exchange (dsh-mode-exchange)

## What this plugin is for

In DSH, an Agent mode (Standard / PTC / Code / Research …) is frozen into a plugin composition
**when the session starts**. `agentPresets.select()` only works before the first turn of a session;
`agent-presets/locked` stops it afterwards, and `recompose()` requires a blank Agent.
So for a long-running session, the only official way to change mode is to start a new session.

This plugin offers two complementary paths:

| Capability | Command | What it really does | Cost |
| --- | --- | --- | --- |
| **A. Runtime soft switch** | `/switch-mode <mode>` | Replaces the system prompt, denies the old tools for this session, attaches the new ones | Session ID and history stay; it is **not** a real preset composition |
| **B. Migrate & rebuild** | `/migrate-session --mode <mode>` | Export the log → create a session with the target preset → import the log as a native event sequence | A real mode; but it is a new session ID, and the old session is archived by default |

Both are also reachable from the "Mode Exchange" sidebar panel, and the plugin settings page
holds the defaults.

## A. What the soft switch actually does

Within the current session's scope only, three things happen (all reversible):

1. **Swap the system prompt.** In the `system-prompt/assemble` waterfall, every existing section is
   dropped and replaced by one section describing the target mode (its tool inventory and working
   style).
2. **Deny the old tools for this session.** `agent.ctx.tools.restrict({ deny })` removes
   "present now, absent in target" tools from **both declarations and dispatch** — the model stops
   seeing them and calling them is refused. The restriction lives in the session's own scope layer.
3. **Attach the new tools.** Tools "absent now, present in target" are registered into the session
   scope with a `when` gate so they are visible only here.

A `tools.guard` is installed as a second line of defence. The pre-switch state is snapshotted to
`<data dir>/state/switches.json`, so it survives a plugin rebuild (changing settings re-runs `apply`),
and `/switch-mode --revert` undoes everything.

### Why "soft"

The plugin composition, the tool *executor* (native vs PTC `run_code` transport), subagents and
teams do not change. If the target mode differs only in *which tools exist and how the prompt reads*,
the soft switch is enough. If it differs in *how tools are executed*, only capability B delivers it.
The panel and the command output always say so instead of pretending success.

## B. The seven migration steps

```
① export  → <export dir>/exports/<timestamp>-<short id>.jsonl (+ .meta.json with sha256)
② verify  → parseable lines / event count / seq contiguous from 0 / sha256; abort and keep evidence on failure
③ create  → create a session with the target mode as its agentPreset and mount that mode's composition
④ import  → write the exported native event sequence as the new session's constructor seed
⑤ team    → with --team on, call agentTeams.setEnabled(true) on the new session's root Agent
⑥ archive → with --delete-old true, back up and then archive the old session (see below)
⑦ report  → both session IDs, log path, message counts, team state, old-session outcome, timeline
```

Step ④ is a **real import**, not a re-telling: the seed is built exactly like the host's own fork path —
the source event prefix, one `session/end-seed{inherited:true}` marker at index `inheritedEventCount`,
then synthetic closers for any unclosed turn/step and `TOOL_OUTCOME_UNKNOWN` / `TOOL_NOT_STARTED`
results for tool calls that never got one.

Step ⑥ is an **archive**, not a delete: DSH has no delete-session API (`workspaceRegistry.delete()`
removes a *workspace*). The session disappears from grouped lists and pinned lists and its activity is
stopped, but the log file stays on disk and `unarchiveSession` can undo it. Some archiving is
*scheduled* rather than immediate, because the command runs inside the very Agent being archived.

## Safety

- Changes from capability A live in the session scope only; the global profile and other sessions are
  untouched, and everything is disposed when the plugin or the session goes away.
- Archiving is on by default but always needs confirmation (`--yes` on the CLI, a dialog in the panel).
  Without confirmation the old session is kept and the report says so.
- A failed import keeps both the new session and the log file, and the report lists the remaining
  manual steps. The ledger at `<data dir>/migrations/<source session id>.json` prevents a second new
  session for the same source, and offers resume or abandon.
- When team switching cannot be probed at runtime, the toggle is disabled with the reason shown; the
  report records "not enabled + reason" rather than a fake success.

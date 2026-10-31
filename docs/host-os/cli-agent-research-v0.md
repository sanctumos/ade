# Lightweight CLI agent for installer bootstrap troubleshooting

**Status:** locked · 2026-10-31 · **Mark: gptme. Goose is out.**
**Job:** occasional local devops while adapting `sanctumos/installer` bootstraps to a box (linux / docker / WSL / proot). Shell + enough session history to debug a failing customize pass. **Not** a Claude Code / Codex / Cursor-class coding agent. Prefer not Node.
**Corpus host:** NewDev `~/installer-cli-agent-research-temp/` (52-video manifest; **22 transcripts in** when this was filed; batch still running).

Letta Code stays **out** (Node, stateful coding-agent, different fork from Kernel). This report is what replaces it.

---

## Executive summary

**Locked: gptme.** Goose is not a rewrite of gptme and is not the product we want. Compact/efficient gptme is the installer agent; later it is also the natural **brain-doctor** (Kernel / agent-tree diagnostics). A frozen executable is **on the path, not the first step**.

It is a Python, MIT-licensed terminal agent with a real stateful shell, named conversations you can resume and search, and a tool allowlist so we can keep it small (`shell` + file read/patch). Practitioners treat it as the simple “lives in your terminal, runs commands, remembers the thread” tool — which is exactly the I0 job: sit with a bootstrap that broke on proot/WSL/docker and work the problem across a session, not one-shot a PR.

**Goose** (Block / AAIF, Rust, Apache-2.0) stays in this report as rejected research. YAML recipes and a compiled binary are real, and they are the wrong shape: desktop, MCP garden, cron, subagents. Kernel moving to Rust later does **not** mean we take Goose.

**Do not** pick Crush (FSL, TUI-pretty, feature-behind), OpenCode (TypeScript/Node, CC-class), Hermes Agent (always-on daemon), Pi (minimal and good — **Node/TypeScript**), Aider (Python but git-pair-programmer, last push May 2026), or Codex/Claude Code.

---

## Criteria (this job only)

| Need | Why |
|------|-----|
| Shell that actually runs | Bootstrap debug is `apt`/`proot`/`systemctl`/path, not a repo map |
| Session + history | The failure is iterative (“it still isn’t on PATH”) |
| Lightweight | Occasional; not a second ADE / not Letta Code |
| Prefer not Node | Installer and Kernel are Python/bash; Node is a new runtime on every target |
| OSI license | We would vendor or wrap it in `sanctumos/installer` |
| Model-agnostic | Venice / local / whatever the box has |

---

## Background and method

14 `ytsearch` queries on NewDev (`yt-dlp` android client) → 60 hits → 6 off-topic dropped (OSCP, tmux-in-100s, Gource, …) → **52-row** `manifest.tsv`. Audio via yt-dlp; AssemblyAI transcripts. Web/docs/GitHub are additive and called out as such.

Findings use the Doc **#206** tier labels against **the 22 transcripts in hand** (gptme, Goose, Crush, one OpenCode-vs-Goose clip). Aider / Pi / remaining Crush rows were still in the batch when this was filed — do not treat those products as “absent from YouTube,” only “not yet in this transcript set.”

| Tier | Meaning here |
|------|----------------|
| `consensus` | Independent practitioner videos agree |
| `mixed` | Real, but product-specific or split |
| `edge-case` | Few videos; still cited when it is *this job* |

---

## Comparison (facts, not vibes)

Checked 2026-10-31 via GitHub API + project docs. Stars move; licenses and languages do not.

| Tool | Lang | License | Stars | Shell | Session / history | Fit |
|------|------|---------|------:|-------|-------------------|-----|
| **gptme** | Python | MIT | 4.5k | Stateful bash + Python | Named chats, `-r`, `chats search`, fork | **Locked** |
| **Goose** | Rust | Apache-2.0 | 56k | Developer extension | `goose session -r`, YAML **recipes** | **Out** (not a gptme port; wrong product) |
| **Pi** | TypeScript | MIT | 119k | `bash` as one of 4 tools | continue / resume / branch | Good *if* we swallow Node |
| **Aider** | Python | Apache-2.0 | 50k | `/run` | Chat history file; restore is bolted on | Weak for *this* job; **stale** (last push 2026-05-22) |
| **Crush** | Go | **FSL-1.1-MIT** | 29k | bash tool + perms | `--continue` / `--session` | Pretty TUI; not OSI today |
| **OpenCode** | TypeScript | MIT | 222k | full agent | `--continue` / `--session` | CC-class + Node |
| **Hermes Agent** | Python | MIT | 259k | yes | FTS5 + daemon | Too much product |
| **Codex CLI** | Rust | Apache-2.0 | 132k | sandboxed | resume | OpenAI-tied, heavier |
| **Plandex** | Go | MIT | 16k | yes | plans | Last push 2025-10-03 |
| **Letta Code** | Node/TS | Apache-2.0 | — | yes | full coding agent | **Already out** |

---

## Findings

### 1. The job is a **debug conversation with a shell**, not a coding IDE (`consensus`)

gptme’s pitch in the corpus is terminal-native: execute code, edit files, browse, run on **laptops, SSH, tmux, headless, CI** [1]. A walkthrough starts the CLI, offers **new conversation or resume the old one**, then runs a `date` via **shell with a yes/no approval**, and later **searches past conversations** for a topic the user mentioned [2]. That is the I0 loop: keep the thread while PATH, proot, and docker keep lying.

Goose’s official CLI video: install, `goose session`, then **`goose session -r` to resume** and keep going after adding an extension [3]. A third-party PATH/zshrc install failure is the closest video we have to “customizing a bootstrap to a system”: the agent edited `.zshrc`, claimed success, the user’s **current** terminal still said `command not found`; they had to keep saying it was still broken until the agent distinguished sandbox vs interactive session vs a later PATH override [4].

> [2] — “It will ask if you want to start a new conversation or resume the old one.”
>
> [2] — “Another thing it can do is search your past conversations with itself.”
>
> [3] — “We can resume our previous session by running Goose Session R.”
>
> [4] — “keep on saying, no, it's not right… and let it kind of reiterate and refine a way of fixing it.”

**For us:** named session per environment (`installer-linux`, `installer-proot`). Do not one-shot `gptme --non-interactive` for the first spike.

### 2. Slim the tool surface; do not adopt a spaceship (`consensus` among “alternative to CC” videos)

Mark’s bar is “good enough, not beefy.” Crush walkthroughs praise the TUI and then list what it **lacks** vs Claude Code / OpenCode (hooks, plugins, custom subagents) [5]. Goose marketing videos sell recipes, subagents, 30 providers, MCP gardens, cron — useful, also the opposite of “very lightweight” [6]. Pi (docs; transcripts still queued) exists specifically because Claude Code became “a spaceship”; it is four tools (`read`/`write`/`edit`/`bash`) — but **Node**.

gptme is the one that is **already** a small Python CLI and documents a **minimal context** mode: `--system short --tools shell,read,patch,save` (project docs, not a transcript). That matches “occasional local devops” without forking the product.

**For us:** ship an allowlist in the installer wrapper. Do not take Goose.

### 3. YAML recipes are the Goose-shaped version of “adapt this bootstrap” (`mixed` — Goose-specific, high leverage)

Official Flight School: recipes are how you make Goose do **repetitive** work from the CLI; advanced recipes add provider/model settings, MiniJinja logic, file includes, and **subrecipes sequential vs parallel** [7]. Headless: `goose run --recipe … --no-session`, plus `goose schedule add` onto cron [8]. A GitHub overview frames recipes as “reusable pipeline templates” after you have survived PATH/WSL install traps [9].

That maps cleanly onto installer **contracts**: one recipe per bootstrap family, parameters from Registry sysinfo (`os`, paths). It is more harness-shaped than gptme’s named chat. It is also more moving parts (Jinja, extensions, headless turn-limit footguns in [9]).

> [7] — “These recipes are a powerful way to have Goose do your repetitive work.”
>
> [8] — “Headless mode is a powerful way to use Goose where you just need Goose to do something without any interaction.”

**For us:** harness contracts stay **files in git** (installer recipes / scripts). gptme is the **interactive debugger** when adaptation is wrong — not Goose recipes as the agent. Those jobs stay split.

### 4. Environment detection is the actual failure mode (`edge-case` in count, **load-bearing** for Registry)

Goose install content spends real time on **PATH not exported**, curl-piped install prompts that **fail silently**, and **WSL vs native Windows** fetching the wrong binary [9]. The zsh video is the same class of bug as proot vs systemd vs docker [4].

**For us:** this is why Registry **sysinfo** exists. The CLI agent is not the detector — it is the **debugger** when the harness’s adaptation is wrong. Do not skip R0.

### 5. Node/TS is the popular “CC alternative” and we should not follow the crowd (`consensus` in this corpus’s OpenCode/Crush/Pi cluster)

Charm’s Crush **was** OpenCode-the-Go-app; SST’s TypeScript OpenCode kept the name; Charm renamed to Crush [5]. OpenCode is the 2026 default OSS CC-alike (MIT, 222k stars, `--continue` / `--session`). Pi is the minimal Node harness (119k). Mark already flinched at Letta Code because it is Node. The corpus does not argue we need that stack for bootstrap debug.

**For us:** Node is acceptable only if we pick Pi *on purpose* for the four-tool minimalism. Default: stay Python.

### 6. Aider is the wrong shape even though it is Python (`web` + pending transcripts)

Aider is the famous Python pair-programmer: git commits, repo map, `/run` for shell, `--restore-chat-history`. Last GitHub push **2026-05-22**; gptme’s own alternatives page flags that. Session restore is a flag on a markdown history file, not first-class named conversations. Fine for editing installer **source**; weak as the **runtime** debugger on a foreign box.

---

## Anti-patterns

1. **Vendoring Letta Code / OpenCode / Hermes** “because it is in the family / popular.” Wrong weight class.
2. **Crush in the installer** — FSL is not OSI; Charm TUI is not the job.
3. **Goose** on a Sanctum box (Desktop, CLI, recipes, MCP garden). Mark rejected the product. Kernel-in-Rust later is not a reason to import it.
4. **Aider as the harness** because it is Python. It will try to commit the user’s disk.
5. **Headless one-shot** as the first spike. The zsh video is the warning: the agent will declare victory from a sandbox.
6. **Skipping Registry sysinfo** and asking the LLM to “detect the OS.” Detection is R0; the agent troubleshoots the remainder.

---

## Recommendation for I0 (locked)

**gptme, compact surface, inside `sanctumos/installer` as a wrapper — not the whole gptme product.**

```text
uv tool install 'gptme[minimal]'   # extra is empty; ARM/musl/Termux-friendly
# or pipx; no [server] [browser] [tui] [computer]
gptme -y --name installer-proot \
  --system short \
  --tools shell,read,patch,save \
  "Registry sysinfo says proot. Bootstrap X failed. Continue from the log."
# later:
gptme -y --name installer-proot -r
```

Venice (or local) as the model. No Node on the target. History is the conversation log on disk. Optional later: a 20-line wrapper that injects `GET /v1/sanctum/registry/sysinfo` into the first prompt.

**No HITL (locked):** `-y` / `--no-confirm` so tools run without yes/no. Wrapper always passes it. Do **not** use `--non-interactive` as the default UX — that is the unattended one-shot that declares victory from a sandbox. Named session stays; confirmations do not. Constraint is the tool allowlist (and later the frozen binary), not a human clicking through shell.

**Not now:** Goose, Pi, Aider, Crush, OpenCode, Hermes, Codex, Letta Code.

### Compact now vs freeze later

| When | What |
|------|------|
| **I0 (this spike)** | `gptme[minimal]` + `-y` + `--system short` + `--tools` allowlist. Otto-only on a lab box. Do not ship onto every Sanctum install. Do not enable server / TUI / browser / computer-use / MCP garden. |
| **Later (packaging)** | Pin version; freeze to an executable (upstream already has a **PyInstaller** extra used as a Tauri sidecar). That is hardening “loose Python” into a blob, not a Rust rewrite of gptme. A thin Sanctum shim that execs that blob is allowed. |
| **Later (roles)** | Same compact agent as **installer debugger** and as **brain doctor** (Kernel / Broca / Registry trees after Letta is pared). Not inside the Kernel. Kernel→Rust is a separate rewrite. |
| **Never this path** | Port gptme to Rust “because Goose exists.” Goose is a different product. |

---

## Open questions (remaining)

1. ~~gptme vs Goose vs Pi~~ **gptme.**
2. May the spike use **Venice** as the model, or must it run local-only on airgapped boxes?
3. First ship is **Otto-only** (locked for I0). When (if ever) does a frozen binary land **on the target box**?

---

## Source attribution (highest density for this job)

| Rank | Why |
|---:|---|
| [2] | gptme resume + conversation search + shell approval |
| [4] | Real bootstrap-class PATH/zsh fight |
| [3] | Official Goose CLI + `session -r` |
| [7] [8] | Recipes / headless — harness shape |
| [9] | WSL/PATH install traps |
| [1] | gptme environments: SSH/tmux/CI |
| [5] | Crush vs CC/OpenCode — TUI not the job |

---

## Footnotes

1. [*Claude Code Has a New Open-Source Challenger：GPTME*](https://www.youtube.com/watch?v=qar49s7gM-8)
2. [*Agent - GPTMe : This AI Agent is EASIEST & CAN DO ANYTHING!*](https://www.youtube.com/watch?v=HXihzxUJHf8)
3. [*Getting Started with the Goose CLI*](https://www.youtube.com/watch?v=SbomoGzTRQY)
4. [*Goose AI Fixed My Broken Zsh Config (and Saved Me Hours)*](https://www.youtube.com/watch?v=fk6S4yLxzYU)
5. [*Why Crush Is the Best‑Looking AI Coding CLI (RIP Claude Code?)*](https://www.youtube.com/watch?v=kCcCxzCSf_w)
6. [*Goose Is Destroying Pi.dev and Claude Code*](https://www.youtube.com/watch?v=yAx8-_IYdWI)
7. [*Flight School - Advanced Tips for Recipes/Subrecipes in goose*](https://www.youtube.com/watch?v=1szmJSKInnU)
8. [*Flight School - Headless Goose, Scheduling a Parallel-Subagent Recipe*](https://www.youtube.com/watch?v=gvg7DomaJuA)
9. [*Goose GitHub Overview: How Local AI Agents Use MCP, Permissions, and Headless Runs*](https://www.youtube.com/watch?v=ycaeJ05x3TQ)
10. [*Install GPTme with Ollama and QWQ Locally*](https://www.youtube.com/watch?v=QBmFw7eiLPU)
11. [*A beautiful terminal experience that can code - Charm Crush*](https://www.youtube.com/watch?v=3crlgrd86r0)
12. [*The Open Source AI Agent That Actually Controls Your PC (Goose + MCP)*](https://www.youtube.com/watch?v=wNr2gqn909o)

Also used (docs/GitHub, not transcripts): gptme.org CLI/usage/tools/alternatives; Goose recipe + session docs; Aider commands; Crush README/license; GitHub API for gptme, Aider-AI/aider, aaif-goose/goose, charmbracelet/crush, anomalyco/opencode, earendil-works/pi, openai/codex, plandex-ai/plandex, NousResearch/hermes-agent (2026-10-31).

---

## Methodology appendix

| Item | Value |
|------|--------|
| Host | NewDev `64.95.11.220` · `~/installer-cli-agent-research-temp/` |
| Manifest | `manifest.tsv` · 52 rows |
| Queries | `queries/SEARCH_QUERIES.md` |
| Transcripts | `transcripts/NN_<id>.txt` (+ `.meta.json`) · **22 in** at file time; batch continues |
| Web | product docs + GitHub API, labeled separately from YouTube |
| Not in this transcript set yet | Aider walkthroughs, Pi deep-dives, remaining Crush/OpenCode rows |

When the batch finishes, a short comment on the Tasks doc can add Aider/Pi quotes. The **pick does not wait** on those: Aider’s shape and Pi’s Node are already decided from docs + this Goose/gptme/Crush set.

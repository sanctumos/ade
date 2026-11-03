# Sanctum OS — terminology (v0)

**Status:** revised 2026-11-03 · Doc #1643  
**Does not replace:** public [SanctumOS Naming Rubric](https://sanctumos.org/docs/architecture/naming-rubric)

Sanctum is **not** OS-themed *or* neuroscience-themed. Both, by layer.

---

## Four camps (already locked)

| Camp | What it names | Rule | Examples |
|------|----------------|------|----------|
| **1. Global / OS / infrastructure** | Plumbing, not cognition | Plain tech | **Kernel** (Letta), **Registry**, **SMCP**, **ADE**, installer harness |
| **2. Agent modules** | Cognitive / sensory / speech | Macro brain regions | **Broca**, **Thalamus**, **Cerebellum**, **Cochlea** |
| **3. Letta / AI industry** | Ecosystem contracts | Keep the word | agent, tool, memory block, SDK, MCP |
| **4. Primes** | People | Proper nouns | Athena, Monday, Ada |

If it does not map to a brain region, do not force one. **Registry** is Windows-Registry-shaped plumbing. Not Brainstem.

---

## Locked names (this draft)

| Thing | Camp | **Name** | Is not |
|-------|------|----------|--------|
| The whole box | product | **SanctumOS** | Kernel, Registry |
| Letta runtime `/v1/agents` | 1 + 3 | **Kernel** | Registry, Broca — **required**, not optional |
| On-box config + inventory + light Broca transport | 1 | **Registry** (`sanctumos/registry`) | The installer, the Kernel |
| On-disk land for Registry process | 1 | `~/sanctum/registry/` (auth, state) | Product name |
| Owner web client | 1 | **ADE** | A Broca, Letta Cloud ADE |
| Per-agent speech / ingress | 2 | **Broca** | Registry, “the OS” |
| Tool bus | 1 | **SMCP** | Letta’s MCP-servers tab |
| Composite person | 4 + Registry row | **Sanctum Agent** (`uid`) | A Letta uuid |
| ADE Chat speaker | owner | **owner** (`platform=ade`) | Otto |

**Dropped:** **Host** as the product noun. Too generic. The sidecar is **Registry**.

---

## Prime agent (locked 2026-11-03)

| Term | Means | Is not |
|------|--------|--------|
| **Prime agent** | The **conscious loop** — the main Letta agent for that person | A **cerebellum**; a **sleeptime** |

v0.1.0 on moya fills the hive for **primes only**. Cerebellums and sleeptimes come later.

Disk layout for modules: `agents/<agent name>/<module>` — e.g. `agents/athena/broca`. No `agent-` prefix, no `broca2`.

---

## Registry vs Installer (the split)

Windows: **Registry** is the database. **Installer / SCM** consume it and write back. You do not ask winreg to install Office.

| | **Registry** | **Installer** |
|--|--------------|---------------|
| Holds | Sysinfo (`os` + `kind`), layout root, ports, installed vs desired, Sanctum Agent graph; **self-served docs** | Bootstrap *scripts* + adaptation logic |
| Does | Serve facts over HTTP; **light transport** ADE ↔ Broca; serve `/docs` for humans and agents | Poll Registry, pick/adapt a bootstrap, apply, write facts back |
| Does not | Become apt/ansible; ship `apply` | Become a second Settings URL for ADE Chat |

**This phase:** Registry v0 only. Installer spike is a **future bookmark**.

---

## Prose vs names

| Allowed in sentences | Not a rename |
|----------------------|--------------|
| Broca is the OS mouth | No component called Mouth |
| Letta is the kernel | Kernel = Letta (required) |
| Registry is the OS hive | No component called Hive (unless we later name a hive file) |

---

## ADE labels (when UI exists)

| Surface | Label |
|---------|--------|
| Default send | **Chat** (via Registry transport → Broca) |
| Optional Letta `/messages` | **Kernel** (labeled alternate — Kernel itself is still required on the box) |
| What’s on this box / edit hive | **Registry** (sidebar editor — regedit-like) |
| Install / adapt bootstraps | **Installer** (CLI-first; **not this phase**) |
| Future installer debugger | **gptme** (compact CLI; not Goose) — consumes Registry live docs |

# Sanctum Host OS — terminology (v0)

**Status:** first draft addendum · 2026-10-31  
**Does not replace:** public [SanctumOS Naming Rubric](https://sanctumos.org/docs/architecture/naming-rubric)

Sanctum is **not** OS-themed *or* neuroscience-themed. It is **both, by layer**. Tonight’s Host draft does not invent a fifth camp.

---

## The four camps (already locked)

From the public rubric:

| Camp | What it names | Rule | Examples that already exist |
|------|----------------|------|-----------------------------|
| **1. Global / OS / infrastructure** | Plumbing that is not cognition | Plain tech. Short, descriptive. | **Kernel** (Letta), **SMCP**, **UI**, installer `control/` |
| **2. Agent modules** | Cognitive / sensory / speech functions | Single-word **macro** brain regions | **Broca**, **Thalamus**, **Cerebellum**, **Cochlea**, Hippocampus / Glymphatic (dream) |
| **3. Letta / AI industry** | Ecosystem contracts | Keep the industry word | agent, tool, memory block, SDK, MCP |
| **4. Primes** | People | Mythic / personal proper nouns | Athena, Monday, Ada |

Test from the rubric: *if it does not map naturally to neuroanatomy, it belongs in tech or industry.* Do not shoehorn a brain name onto a sysadmin surface.

---

## This draft, named in those camps

| Thing | Camp | **Locked name** | Do not call it |
|-------|------|-----------------|----------------|
| Letta runtime + `/v1/agents` | 1 + 3 | **Kernel** (product: Letta) | Broca, Host, “the OS” |
| On-box sidecar `/v1/sanctum/*` | 1 | **Host** (process: `sanctum-host`) | Brainstem, skull, meninges, a new Broca |
| On-disk drawer | 1 | **`control/`** | A second product name |
| ADE | 1 (UI) + product | **ADE** — owner’s web client | Letta Cloud ADE, a Broca plugin’s display name |
| Per-agent speech / ingress | 2 | **Broca** | speech daemon, chat bus, “the OS” as a proper noun |
| Tool bus process | 1 | **SMCP** | “the Thalamus”, Letta MCP-servers tab |
| Composite person on the box | 4 + registry | **Sanctum Agent** (`uid` e.g. `athena`) | a Letta uuid |
| Optional extra Letta loops | 2 / 3 | **sleeptime**, future **Cerebellum** | Host modules |
| Chat speaker in ADE→Broca | 4’s human | **owner** (`platform=ade`) | Otto |

**Host** stays a technical name because it installs, starts, stops, and proxies **loopback**. That is organism-housekeeping only in the boring sense. It is not a cognitive module.

---

## Prose vs names

Architecture docs may say **“Broca is the OS mouth”** or **“Letta is the kernel.”** Those are explanations.

| Allowed in sentences | Not a rename |
|----------------------|--------------|
| Broca is the OS mouth | Do not ship a component called Mouth |
| Letta is the kernel | Kernel already means Letta (camp 1) |
| Host is the OS face | Do not ship a component called Face or Brainstem |

API paths, repo folders, and ADE labels use the **locked names** in the table. Metaphors stay in docs.

---

## What we are not doing

- Renaming Broca to something Unix-y
- Naming Host after a brain region so the sidecar “feels more Sanctum”
- Calling ADE a Broca
- Using **kernel** for Host or for SanctumOS-the-product (SanctumOS is the whole box; Kernel is Letta)

---

## ADE labels (when UI exists)

| Surface | Label |
|---------|--------|
| Default send | **Chat** (Broca / Host) |
| Optional Letta `/messages` | **Kernel** |
| Install / SMCP / Broca start-stop | **Host** |

---

## Pointers

- Rubric: `sanctumos.org` `docs/architecture/naming-rubric.md`
- Architecture draft: [architecture-v0.md](architecture-v0.md)
- API map: [api-map-v0.md](api-map-v0.md)

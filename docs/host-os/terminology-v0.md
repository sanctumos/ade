# Sanctum OS — terminology (v0)

**Status:** first draft · 2026-10-31  
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
| Letta runtime `/v1/agents` | 1 + 3 | **Kernel** | Registry, Broca |
| On-box config + inventory + light Broca transport | 1 | **Registry** (`sanctum-registry`) | The installer, the Kernel |
| `sanctumos/installer` evolved | 1 | **Installer** (harness — experimental shape) | A pile of unrelated shell one-shots forever |
| On-disk drawer for Registry process | 1 | `control/` (may grow `registry/`) | Product name |
| Owner web client | 1 | **ADE** | A Broca, Letta Cloud ADE |
| Per-agent speech / ingress | 2 | **Broca** | Registry, “the OS” |
| Tool bus | 1 | **SMCP** | Letta’s MCP-servers tab |
| Composite person | 4 + Registry row | **Sanctum Agent** (`uid`) | A Letta uuid |
| ADE Chat speaker | owner | **owner** (`platform=ade`) | Otto |

**Dropped:** **Host** as the product noun. Too generic. The sidecar is **Registry**.

---

## Registry vs Installer (the split)

Windows: **Registry** is the database. **Installer / SCM** consume it and write back. You do not ask winreg to install Office.

| | **Registry** | **Installer** |
|--|--------------|---------------|
| Holds | Sysinfo (Linux, WSL, Docker, proot, …), layout root, ports, installed vs desired, Sanctum Agent graph | Bootstrap *scripts* + adaptation logic |
| Does | Serve facts over HTTP; **light transport** ADE ↔ Broca | Poll Registry, pick/adapt a bootstrap, apply, write facts back |
| Does not | Become apt/ansible | Become a second Settings URL for ADE Chat |

Tonight’s earlier draft stuffed apply/jobs onto the sidecar. **Wrong grain.** Apply is installer work. Registry stays a registry.

---

## Prose vs names

| Allowed in sentences | Not a rename |
|----------------------|--------------|
| Broca is the OS mouth | No component called Mouth |
| Letta is the kernel | Kernel = Letta |
| Registry is the OS hive | No component called Hive (unless we later name a hive file) |

---

## ADE labels (when UI exists)

| Surface | Label |
|---------|--------|
| Default send | **Chat** (via Registry transport → Broca) |
| Optional Letta `/messages` | **Kernel** |
| What’s on this box | **Registry** |
| Install / adapt bootstraps | **Installer** (may be CLI-first while we experiment) |

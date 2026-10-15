# PRD stub — Sanctum ADE v2 × bootstrap installer

**Status:** ideation stub (v0.3) — **extend on-box Letta API** with Sanctum endpoints; composite Sanctum Agent  
**Date:** 2026-10-15  
**Product:** Sanctum ADE (next major after v1 static UI) + SanctumOS installer evolution  
**Related:** `sanctumos/installer` (kernel bootstraps, control plane), canonical layout in installer `docs/reference/docs-on-installer-criteria.md`

---

## 1. Problem

Sanctum ADE v1 is a **client**: talk to an already-running Letta-compatible `/v1` API. The next version wants to be a **control surface** for a Sanctum host:

- Flip **Broca** (and related agent wiring) on/off or between instances
- **Install / enable** other Sanctum components (SMCP, Tasks, Environment, companion bits, etc.) into the **prescribed on-disk layout**
- Stop treating “install Sanctum” as one monolithic script that does everything in one sitting

Today’s installer already hints at the right shape (`sanctum_bootstrap.sh`, Letta local/proot variants) but it is still **procedural monoliths**, not a **callable collection of bootstraps** ADE (or a human) can compose.

---

## 2. Goals (what “good” looks like)

1. **Bootstraps, not a blob** — Each installable unit is a named, idempotent bootstrap that lands files/config/services in the canonical tree (`~/sanctum/…` or `/sanctum/…` per layout doc).
2. **API-driven on the box** — Every Sanctum box already runs a **Letta API**. Sanctum install/meta/Broca verbs should show up as **additional endpoints on that same API surface** (ADE keeps one base URL + one bearer), not a second unrelated control daemon by default.
3. **ADE as the switchboard** — UI lists composites/modules and triggers enable/disable via those Sanctum endpoints (plus existing Letta agent/chat routes).
4. **Same verbs for CLI and ADE** — CLI hits the same on-box `/v1` (or `/v1/sanctum/…`) as ADE.
5. **Prescribed folders** — Bootstraps do not invent paths; they implement the layout contract (agents/, broca, smcp/, control/, shared venv rules, etc.).
6. **Safe to re-run** — Idempotent; declare state; refuse or migrate when invariants break.
7. **Composite Sanctum Agents** — One “agent” in Sanctum/ADE can map to **many** Letta agents (main loop, sleeptime, future cerebellum, …) plus host modules (Broca, SMCP). Wizard/meta endpoints create the **bundle**; granular endpoints still exist for each piece.
8. **Microservices for data** — Sanctum state does **not** live in Letta Postgres (per-module SQLite / Sanctum registry). Broca/SMCP stay their own processes. Extending the **HTTP surface** ≠ merging the **databases** or folding Broca into the Letta runtime.
9. **One API face per box** (Mark 2026-10-15) — Operators and ADE think: “the Letta API on this Sanctum box,” extended with Sanctum routes—not “Letta plus a second host API I have to configure.”

### Non-goals (for this stub)

- Merging Sanctum schema into Letta Postgres
- Running Broca/SMCP *inside* the Letta agent loop / SyncServer business logic
- Replacing DSC multihost / Ada deploy lane for *product* sites
- Solving every Sanctum component in v2.0 — pick a thin vertical first
- Making ADE a full PaaS

---

## 2b. Clarification — “extend the Letta API on the box” (v0.3)

Earlier stub language assumed a **separate** Host microservice. Mark’s target is different:

> What lives on every Sanctum box is the Letta API. **Extend that** with Sanctum endpoints (Broca on/off, meta-create full Sanctum Agent, etc.).

So the product question is **how** to extend that face—not whether ADE talks to two unrelated servers.

| Approach | What ADE hits | Sanctum code lives | Risk |
|----------|---------------|--------------------|------|
| **E1 — Fork-mount routers** | Same origin as Letta (`:8283/v1/sanctum/...`) | Extra FastAPI routers in Sanctum’s Letta fork; handlers call Sanctum libs + Letta managers over in-process/`SyncServer` only where needed; Sanctum DB = SQLite beside the box | One process to run; upgrade merges on `ROUTERS` / `app.py`; must keep handlers thin |
| **E2 — Sidecar, same URL** | Same origin via nginx/`proxy.php` (`/v1/agents` → Letta, `/v1/sanctum` → sidecar) | Separate Sanctum process; path-split at edge | True process isolation; two processes; ADE still one base URL |
| **E3 — Separate Host API** (earlier stub default) | Second base URL | Separate process | Cleanest isolation; worse “every box” UX (two settings) |

**Leaning for investigation:** **E1 or E2** (one face). **E3** only if fork-mount proves too painful.

**Still true from the Classic peek:** Letta’s router list is easy to extend; SyncServer/Postgres are not where Sanctum composite state should live. E1 done right = new routers + Sanctum services, not “grow SyncServer.”

---

## 3. Constraints we already own

From the installer layout canon (Aug 2025):

| Invariant | Implication for bootstraps |
|-----------|----------------------------|
| Shared Sanctum venv (with SMCP as the known exception) | Bootstrap must declare venv needs / never silently fork interpreters |
| Per-module SQLite under module `db/` | Bootstrap creates module skeleton, not a shared mega-DB |
| Agent tenancy = `agents/<uid>/` | Broca switch is per-agent (or per-agent-module), not global-only |
| Ports recorded / unique | Bootstrap allocates or registers port; ADE shows it |
| Secrets stay local | ADE triggers; does not become a secret warehouse |
| **No shared Postgres with Letta** (Mark 2026-10-15) | Host API / Sanctum agent registry use Sanctum DBs only; Letta agents referenced by id over `/v1` |

Existing artifacts to **factor**, not throw away:

- `kernel-installer/sanctum_bootstrap.sh` (host + Letta + nginx era)
- `sanctum_bootstrap_local_letta.sh` / `_proot_letta.sh`
- Control / registry ideas under `installer/control*`

---

## 4. Ways to skin the cat

Approaches below. Same destination (callable bootstraps + ADE switches); different spines.

### Emerging frame — Option E: Sanctum endpoints on the on-box Letta API

**Mark (2026-10-15):** Letta is API-driven. Why shouldn’t install bootstraps be?  
**Mark (2026-10-15):** Extending **the Letta API that lives on every Sanctum box**—not a second control-plane URL by default.

**Idea:** Sanctum routes (install/meta/Broca) appear under that box’s Letta API face (`/v1/sanctum/…` or sibling resources). Implementation is E1 (fork routers) or E2 (sidecar behind same proxy). That surface owns:

| Resource | Rough verbs |
|----------|-------------|
| `/v1/bootstraps` | List available bootstrap units + manifests |
| `/v1/bootstraps/{id}` | Get contract (deps, paths, env schema) |
| `/v1/components` | Installed/desired inventory on this host |
| `/v1/components/{id}` | GET status · PUT/PATCH desired state · DELETE uninstall |
| `/v1/components/{id}/actions/apply` | Run reconcile (install/configure/start as needed) |
| `/v1/agents/{uid}/modules/broca` | Broca switch as a first-class sub-resource |
| `/v1/jobs/{job_id}` | Long-running apply logs / SSE (install isn’t always sync) |

Implementation behind the API can still be shell/Python recipes (Option A guts) or a reconciler (Option B guts). **The public contract is HTTP**, the way Letta’s public contract is `/v1`.

```text
┌─────────────┐   one base URL    ┌─────────────────────────────┐
│ Sanctum ADE │ ────────────────► │ On-box Letta API (extended) │
│ CLI / Otto  │                   │  /v1/agents …     (Classic) │
└─────────────┘                   │  /v1/sanctum/…    (ours)    │
                                  └───────────┬─────────────────┘
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                 Letta runtime DB      Sanctum SQLite         Broca / SMCP
                 (unchanged)           (composites/jobs)      (own processes)
```

| Pros | Cons |
|------|------|
| Matches “every Sanctum box has a Letta API” | Sanctum Letta **fork** (or careful sidecar path-split) |
| ADE: one Settings base + one key | E1: merge cost on upstream Letta pulls |
| Same password middleware / ops muscle memory | Must not leak Sanctum state into Letta Postgres |
| Meta + granular on one OpenAPI | Job/SSE for long applies still needed |

**Relationship to A–D:** E (on-box extended API) is the **face**. A/B/D are backends behind Sanctum handlers; C only if control plane *is* that extension.

---

### Option A — Recipe pack (dumb scripts, smart docs)

### Option A — Recipe pack (dumb scripts, smart docs)

**Idea:** A directory of shell/Python recipes:

```text
bootstraps/
  letta-oss/
  broca-agent/
  smcp/
  ade-static/          # drop public/ behind nginx or flask
  manifest.toml        # id, deps, paths, ports, healthcheck
```

ADE shells `bootstrap run broca-agent --agent athena`. Orchestration is Make/justfile or a 200-line runner that respects `depends_on`.

| Pros | Cons |
|------|------|
| Matches how Otto/Ada already work | Easy to grow into spaghetti |
| Trivial to audit on a box | Weak typing / weak “desired state” |
| Fast to ship Broca switches | ADE must scrape script exit codes + logs |

**Best if:** We want momentum and the first Broca switch this quarter.

---

### Option B — Manifest + state machine (desired state)

**Idea:** Each component is a **manifest** (YAML/JSON) declaring:

- `id`, `version`, `paths[]`, `ports`, `systemd|screen|docker`, `health_url`
- `depends_on: [letta-oss, sanctum-venv]`
- `actions: install | configure | start | stop | uninstall`

A small **bootstrap daemon or CLI** reconciles desired vs actual (files exist? port listening? Broca queue up?). ADE posts desired state (`broca.enabled=true` for agent X).

| Pros | Cons |
|------|------|
| Idempotent by design | More upfront design |
| ADE becomes a thin control UI | Risk of over-building Ansible-at-home |
| Clear “installed but stopped” vs missing | Need a real state store (SQLite under `control/`) |

**Best if:** Broca switches and multi-component installs must not diverge between hosts.

---

### Option C — ADE embeds Control plane (installer UI revival)

**Idea:** Evolve `installer/control` into the **backend** ADE talks to. ADE v2 is the new skin; control keeps registry.db, start/stop scripts, catalog of tools. Bootstraps are plugins registered in the control catalog (“Tools” grid → real installers).

| Pros | Cons |
|------|------|
| Reuses registry / agents / tools schema work | Ties ADE to PHP/Flask control stack choices |
| Natural home for Broca settings UI | Control is alpha / partial — may fight us |
| Clear split: ADE UX vs host authority | Two repos to keep in sync |

**Best if:** We still believe in an on-box control plane and ADE is “just” the ADE-shaped client.

---

### Option D — Package units (OCI / deb / “Sanctum packs”)

**Idea:** Each component is a **pack** (container image or versioned tarball + rootfs overlay) that unpacks into prescribed folders. Bootstraps become `pack install broca@2.1 → agents/<uid>/broca/`. ADE browses a pack index (GitHub releases or a Sanctum channel).

| Pros | Cons |
|------|------|
| Version pins, rollbacks | Heavier for Termux/proot/Android hosts |
| Clean “what’s installed” | Pack authoring cost |
| Fits Ada/VPS world well | Worse fit for Mark’s phone / slim boxes unless we keep thin packs |

**Best if:** Multihost/VPS is the primary Sanctum runtime and mobile stays a special case with a thin subset.

---

### Hybrid sketch (updated leaning — still not locked)

> **On-box Letta API + Sanctum routes (E1 or E2)** as the face · **B manifests** as schema · **A recipes** behind `apply` · Sanctum SQLite for composites · Letta Postgres untouched · Broca/SMCP stay microservices.

- ADE Settings: single API base (the box’s Letta URL) — Sanctum paths under `/v1/sanctum/…`
- Broca switch / meta-create = Sanctum handlers; they **call** Classic agent APIs and host recipes
- Break-glass: recipes on disk; supported path = HTTP on the box API

---

## 4b. Composite Sanctum Agent (meta-calls) — Mark 2026-10-15

**Does this make sense?** Yes. It’s the missing product noun.

Today humans already think “Athena.” On the box that is already (or will be):

| Sanctum concept | Letta layer (granular) | Sanctum host layer (granular) |
|-----------------|------------------------|-------------------------------|
| **Athena** (one Sanctum Agent) | Main-loop agent id | Broca under `agents/athena/` |
| | Sleeptime / sleep-time agent id | (optional) SMCP server/tools bound to her |
| | Future **Cerebellum** agent id | … |

ADE v1 only sees Letta’s flat agent list. ADE v2 + Host API should let you operate at **either** altitude:

### Granular (keep these)

```http
POST /v1/modules/broca/apply          # turn Broca on for uid=athena
POST → Letta /v1/agents               # create one Letta agent (Host API as client)
PATCH /v1/sanctum-agents/{id}/loops/sleeptime
```

### Meta (wizard / “full Sanctum agent”)

```http
POST /v1/sanctum-agents
{
  "name": "Athena",
  "uid": "athena",
  "profile": "full",          # or explicit feature flags
  "loops": {
    "main": true,
    "sleeptime": true,
    "cerebellum": false       # not created yet — optional
  },
  "host": {
    "broca": true,
    "smcp": true
  }
}
→ { "sanctum_agent_id": "…", "job_id": "…" }
```

That one call is an **orchestrated job** that, in order (illustrative):

1. Creates/links Letta agents for each enabled loop (N× Letta `POST /v1/agents` + sleeptime/group wiring as Letta requires)
2. Writes Sanctum registry row: `sanctum_agent` → `{ main_id, sleeptime_id, cerebellum_id?, … }`
3. Applies host bootstraps: Broca for `uid`, SMCP server/tools as requested
4. Returns job progress over SSE so the wizard can show “creating sleeptime… starting Broca…”

**Altitude rule:**

- **Letta** = runtime primitives (one agent = one Letta agent)
- **Sanctum** = product aggregate (one Sanctum Agent = graph of Letta agents + host modules)
- **ADE** = UI that prefers Sanctum altitude for “people,” Letta altitude for deep debug/chat-to-a-specific-loop

```text
                    POST /v1/sanctum-agents  (meta)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Letta /v1         Letta /v1      Host bootstrap
        main agent      sleeptime …      Broca + SMCP
              │               │               │
              └───────────────┴───────────────┘
                              │
                    Sanctum registry (SQLite)
                    — not Letta Postgres —
```

**Install endpoints** (“turn on Broca for xyz-agent”) are the granular host verbs. **Meta-calls** are the compose API the agent-creation wizard hits. Same service, two layers — not two products.

---

## 5. ADE v2 surface (product sketch)

Independent of which spine we pick, the UI wants roughly:

| Area | Behavior |
|------|----------|
| **Sanctum Agents** | First-class list of *composites* (Athena = main + sleeptime + …). Drill into loops. |
| **New agent wizard** | Hits meta `POST /v1/sanctum-agents` with profile flags; streams job |
| **Host** | Base path (`~/sanctum`), Letta `/v1` health, shared venv status |
| **Components / Broca switches** | Granular: enable Broca/SMCP per Sanctum uid without recreating Letta agents |
| **Letta debug** | Escape hatch: raw Letta agent list/chat (v1 behavior) when you need one loop |
| **Install drawer** | Pick bootstrap → paths → apply → SSE log |

---

## 6. Bootstrap contract (minimum viable interface)

Each bootstrap unit is both a **manifest** (GET) and an **apply target** (POST/PATCH):

```text
id:              broca-agent
version:         0.1.0
summary:         Wire Broca under agents/<uid>/broca
writes:          agents/<uid>/broca/{app,config,db,logs,run}
requires:        [sanctum-venv, letta-reachable]
env_schema:      { AGENT_UID, PORT, LETTA_BASE, … }
idempotent:      true
healthcheck:     GET http://127.0.0.1:$PORT/health  (or equivalent)
undo:            optional stop + leave data | wipe module dir
```

### API sketch (illustrative — Letta-rhymed)

**Granular host**

```http
GET  /v1/bootstraps
GET  /v1/components
GET  /v1/sanctum-agents/{uid}/modules/broca
PATCH /v1/sanctum-agents/{uid}/modules/broca
     { "desired": "running", "port": 8871 }
POST /v1/sanctum-agents/{uid}/modules/broca/apply
     → { "job_id": "…" }
```

**Composite / meta**

```http
GET  /v1/sanctum-agents
POST /v1/sanctum-agents                 # wizard — full bundle job
GET  /v1/sanctum-agents/{uid}           # includes letta_agent_ids + modules
PATCH /v1/sanctum-agents/{uid}/loops/cerebellum
     { "desired": "present" }           # add optional loop later
GET  /v1/jobs/{job_id}
GET  /v1/jobs/{job_id}/events           # SSE
```

CLI is a client of the same API:

```bash
sanctum agent create --name Athena --profile full --follow
sanctum module set broca --agent athena --desired running
```

---

## 7. Open questions (hone-in fodder)

1. **Host API process:** Long-lived daemon vs on-demand? Loopback-only vs LAN?
2. **Auth:** Bearer in ADE Settings (like Letta key)? Unix-socket = local trust?
3. **Layout root:** Installer canon vs moya’s lived `~/sanctum/agents/…`?
4. **First vertical:** (a) Broca-on for existing Athena, or (b) meta-create stub Sanctum Agent that only links *existing* Letta ids, then (c) full create bundle?
5. **Sleeptime wiring:** Exact Letta group/sleeptime API shape we must call — freeze against live Classic version on moya.
6. **Cerebellum:** Placeholder loop in the schema now, implement later — yes/no?
7. **Privilege / secrets / packaging home** — unchanged from prior stub.
8. **E1 vs E2:** Fork-mount Sanctum routers into Letta process vs sidecar path-split on same URL?
9. **Chat default:** Opening “Athena” in ADE — which Letta id gets messages?
10. **Fork strategy:** How we carry Sanctum routers across upstream Letta upgrades (overlay package vs long-lived fork).

---

## 8. Suggested hone-in path (process, not architecture)

1. Lock product face: **Sanctum endpoints on the on-box Letta API** (one base URL). Data stays microservices (no Letta Postgres for Sanctum).
2. Spike **E1 vs E2** on a throwaway box: mount `/v1/sanctum/health` both ways; pick by ops pain.
3. Freeze v0 OpenAPI under `/v1/sanctum/…`: Broca module + sanctum-agents GET/POST + jobs.
4. Vertical A: Broca on for existing `athena`.
5. Vertical B: meta-create / link composite (main+sleeptime).
6. Wizard UI last.

---

## 9. Decision log

| Date | Decision |
|------|----------|
| 2026-10-15 | Stub opened; options A–D + hybrid sketched; no winner. |
| 2026-10-15 | Emerging preference: API-driven bootstraps (Option E). |
| 2026-10-15 | **No shared Postgres with Letta** — Sanctum state separate; Broca/SMCP stay own processes. |
| 2026-10-15 | **Composite Sanctum Agent**: one Sanctum entity → N Letta agents + host modules; granular + meta. |
| 2026-10-15 | **Clarified:** extend **the Letta API on every Sanctum box** with Sanctum endpoints (E1 fork-mount or E2 same-URL sidecar)—not a second ADE Settings base by default. Prior “separate Host API URL” was Otto answering the wrong frame. |

---

## 10. References

- Sanctum ADE v1: repo root `README.md`, product tree `public/`
- Installer layout canon: `sanctumos/installer/docs/reference/docs-on-installer-criteria.md`
- Registry / control ideas: `sanctumos/installer/docs/reference/registry_schema.md`
- Kernel bootstraps: `sanctumos/installer/kernel-installer/sanctum_bootstrap*.sh`

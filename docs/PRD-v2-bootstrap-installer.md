# PRD stub — Sanctum ADE v2 × bootstrap installer

**Status:** ideation stub (v0.2) — Host API spine + **composite Sanctum Agent** (meta vs granular)  
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
2. **API-driven (Letta-shaped)** — Install/enable/status are **HTTP resources**, not “ADE shells a script and hopes.” Letta is API-first; Sanctum host ops should be too. ADE is a client of that API (same as it is a client of `/v1` agents).
3. **ADE as the switchboard** — UI can list components, show installed/running/missing, and trigger enable/disable (Broca switches first-class) via the bootstrap API.
4. **Same verbs for CLI and ADE** — CLI is a thin client of the same API (`sanctum bootstrap …` → HTTP), not a parallel codepath.
5. **Prescribed folders** — Bootstraps do not invent paths; they implement the layout contract (agents/, broca, smcp/, control/, shared venv rules, etc.).
6. **Safe to re-run** — Idempotent; declare state; refuse or migrate when invariants break.
7. **Composite Sanctum Agents** — One “agent” in Sanctum/ADE can map to **many** Letta agents (main loop, sleeptime, future cerebellum, …) plus host modules (Broca, SMCP). Wizard/meta endpoints create the **bundle**; granular endpoints still exist for each piece.
8. **Microservices stay microservices** — Sanctum Host API does **not** share Letta’s Postgres. Sanctum state lives in Sanctum stores (per-module SQLite / control registry). Letta remains the agent runtime API we call over HTTP.

### Non-goals (for this stub)

- Rewriting Letta itself / merging Sanctum schema into Letta DB
- Putting Broca/SMCP *inside* the Letta process
- Replacing DSC multihost / Ada deploy lane for *product* sites
- Solving every Sanctum component in v2.0 — pick a thin vertical first
- Making ADE a full PaaS

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

### Emerging frame — Option E: Internal Bootstrap API (Letta-shaped)

**Mark (2026-10-15):** Letta is API-driven. Why shouldn’t install bootstraps be?

**Idea:** A small **on-box Sanctum Host API** (name TBD: `sanctum-host`, `bootstrapd`, control `/v1/…`) that owns:

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
┌─────────────┐     HTTP      ┌──────────────────┐     exec      ┌─────────────┐
│ Sanctum ADE │ ────────────► │ Host Bootstrap   │ ────────────► │ recipes /   │
│ (browser)   │  ← status/SSE │ API (localhost)  │               │ packs / fs  │
└─────────────┘               └──────────────────┘               └─────────────┘
       │                              ▲
       │         same API             │
       └────── CLI / Otto / Ada ──────┘
```

| Pros | Cons |
|------|------|
| Mental model matches Letta + ADE already | One more local service to run/secure |
| ADE stays a static client (or thin SPA) talking JSON | Must define auth (loopback-only? token in ADE Settings?) |
| Otto/Ada/automation get the same surface | Job/SSE semantics for long installs |
| Broca switches are resources, not special UI hacks | Temptation to boil the ocean on v1 of the API |

**Best if:** We want Sanctum host ops to feel like first-class product surface, not “scripts with a dashboard wallpaper.”

**Relationship to A–D:** E is the **spine**. A/B/D become backends behind the API; C is “host API lives inside revived control plane.”

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

> **E (Host Bootstrap API) as the spine** · **B manifests** as the resource schema · **A recipes** (or D packs later) as what `apply` actually runs · **C** only if we decide the API *is* the revived control plane rather than a new thin service.

- ADE v2 never shells out; it calls `http://127.0.0.1:<host-api>/v1/…` (or unix socket)
- CLI / Otto use the same base URL + token
- Broca switch = `PATCH …/agents/{uid}/modules/broca { "desired": "running" }` then poll job/status
- Recipes stay readable on disk for break-glass SSH; API is the supported path

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
8. **Where does the API live?** New thin service (preferred with microservices stance) vs revive `installer/control`.
9. **Chat default:** When user opens “Athena” in ADE, which Letta id gets messages — main only, or routable per loop?

---

## 8. Suggested hone-in path (process, not architecture)

1. Lock: **Host API as separate microservice** (no Letta Postgres); **Sanctum Agent composite** as the product noun.
2. Freeze v0 OpenAPI with **both** layers: granular Broca module + `sanctum-agents` GET/POST (POST may initially only *link* existing Letta ids).
3. Vertical A: `PATCH broca desired=running` for `athena` against lived layout.
4. Vertical B: meta `POST /v1/sanctum-agents` creates main+sleeptime via Letta client + registry row (Broca optional flag).
5. Wizard UI in ADE last — API + job SSE first.
6. Cerebellum / richer profiles after the two-loop bundle is boringly reliable.

---

## 9. Decision log

| Date | Decision |
|------|----------|
| 2026-10-15 | Stub opened; options A–D + hybrid sketched; no winner. |
| 2026-10-15 | Emerging preference: **internal bootstrap API** (Option E) — Letta-shaped; A/B/D as backends; ADE/CLI as clients. Not final lock. |
| 2026-10-15 | **No shared Postgres with Letta** — keep microservices. |
| 2026-10-15 | **Composite Sanctum Agent**: one Sanctum entity → N Letta agents (main, sleeptime, future cerebellum) + host modules (Broca, SMCP). Granular + meta endpoints. Wizard hits meta. |

---

## 10. References

- Sanctum ADE v1: repo root `README.md`, product tree `public/`
- Installer layout canon: `sanctumos/installer/docs/reference/docs-on-installer-criteria.md`
- Registry / control ideas: `sanctumos/installer/docs/reference/registry_schema.md`
- Kernel bootstraps: `sanctumos/installer/kernel-installer/sanctum_bootstrap*.sh`

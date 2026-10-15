# PRD stub — Sanctum ADE v2 × bootstrap installer

**Status:** ideation stub (v0.1) — options retained; **emerging preference: internal bootstrap API** (Letta-shaped)  
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

### Non-goals (for this stub)

- Rewriting Letta itself
- Replacing DSC multihost / Ada deploy lane for *product* sites
- Solving every Sanctum component in v2.0 — pick a thin vertical (e.g. Broca + one shared service) first
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

## 5. ADE v2 surface (product sketch)

Independent of which spine we pick, the UI wants roughly:

| Area | Behavior |
|------|----------|
| **Host** | Base path (`~/sanctum`), Letta `/v1` health, shared venv status |
| **Components** | Cards: Letta, Broca (per agent), SMCP, ADE itself, … — Install / Start / Stop / Open logs |
| **Broca switches** | Per-agent enable, port, Telegram/bridge knobs that map to that agent’s Broca config — not a second Broca |
| **Install drawer** | Pick bootstrap → show paths it will touch → run → stream log |
| **Keep v1 chat** | Agents/chat/memory remain; installer is a new primary nav section (“Host” / “Sanctum”) |

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

```http
GET  /v1/bootstraps
GET  /v1/bootstraps/broca-agent
GET  /v1/components
GET  /v1/agents/{uid}/modules/broca
PATCH /v1/agents/{uid}/modules/broca
     { "desired": "running", "port": 8871 }
POST /v1/agents/{uid}/modules/broca/apply
     → { "job_id": "…" }
GET  /v1/jobs/{job_id}          # status + log cursor
GET  /v1/jobs/{job_id}/events   # SSE while applying
```

CLI is a client:

```bash
sanctum api get /v1/bootstraps
sanctum module set broca --agent athena --desired running
sanctum module apply broca --agent athena --follow
```

---

## 7. Open questions (hone-in fodder)

1. **Host API process:** Long-lived daemon vs on-demand (`systemd socket` / ADE-spawned child)? Loopback-only vs LAN?
2. **Auth:** Shared bearer in ADE Settings (like Letta key)? Or unix-socket = implicit local trust?
3. **Layout root:** Stick to installer canon (`/sanctum` vs `~/sanctum` vs moya’s lived `~/sanctum/agents/…`)?
4. **Broca first vertical:** One agent (Athena) end-to-end before generic component catalog?
5. **Privilege:** How much can the API do without root (Termux / user systemd / screen)?
6. **Secrets:** Generate in module `config/.env` server-side; ADE never stores host secrets beyond the Host API token.
7. **Where does the API live?** New thin service vs revive `installer/control` as that API?
8. **Namespace:** Separate port from Letta (`8283`) — e.g. Host API `:9055` or under a path on the ADE proxy?

---

## 8. Suggested hone-in path (process, not architecture)

1. Lock **spine = Host Bootstrap API (E)** unless Mark vetoes — recipes/manifests are backends.
2. Freeze **v0 OpenAPI** for: list bootstraps, Broca module get/patch/apply, jobs.
3. Implement API + **one** recipe behind it: `broca-agent` for one uid (Athena).
4. ADE v2 Host page: talk only to Host API (plus existing Letta `/v1` for chat).
5. Expand catalog (SMCP, etc.) only after Broca switch feels product-grade.

---

## 9. Decision log

| Date | Decision |
|------|----------|
| 2026-10-15 | Stub opened; options A–D + hybrid sketched; no winner. |
| 2026-10-15 | Emerging preference: **internal bootstrap API** (Option E) — Letta-shaped; A/B/D as backends; ADE/CLI as clients. Not final lock. |

---

## 10. References

- Sanctum ADE v1: repo root `README.md`, product tree `public/`
- Installer layout canon: `sanctumos/installer/docs/reference/docs-on-installer-criteria.md`
- Registry / control ideas: `sanctumos/installer/docs/reference/registry_schema.md`
- Kernel bootstraps: `sanctumos/installer/kernel-installer/sanctum_bootstrap*.sh`

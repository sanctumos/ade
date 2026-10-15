# PRD stub — Sanctum ADE v2 × bootstrap installer

**Status:** ideation stub (v0) — options on the table, no winner yet  
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
2. **ADE as the switchboard** — UI can list components, show installed/running/missing, and trigger enable/disable (Broca switches first-class).
3. **Same recipes CLI and ADE** — Whatever ADE runs, `sanctum bootstrap <id>` (or equivalent) can run headlessly.
4. **Prescribed folders** — Bootstraps do not invent paths; they implement the layout contract (agents/, broca, smcp/, control/, shared venv rules, etc.).
5. **Safe to re-run** — Idempotent; declare state; refuse or migrate when invariants break.

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

Four approaches. Same destination (callable bootstraps + ADE switches); different spines.

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

### Hybrid sketch (likely landing zone — not a decision yet)

Most Sanctum-shaped answer in this workspace tends to look like:

> **B’s manifests + A’s readable recipes**, with ADE as the switchboard (and optionally Control as the on-box API later).

- Human/Otto can read and run one bootstrap file
- Manifest declares deps/health so ADE doesn’t hardcode paths
- Broca switch = `desired: running|stopped` for `agents/<uid>/broca`, not a rewrite of Broca

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

Whatever option we choose, each bootstrap should answer:

```text
id:              broca-agent
version:         0.1.0
summary:         Wire Broca under agents/<uid>/broca
writes:          agents/<uid>/broca/{app,config,db,logs,run}
requires:        [sanctum-venv, letta-reachable]
env:             AGENT_UID, PORT, LETTA_BASE, …
idempotent:      true
healthcheck:     GET http://127.0.0.1:$PORT/health  (or equivalent)
undo:            optional stop + leave data | wipe module dir
```

CLI sketch (illustrative only):

```bash
sanctum bootstrap list
sanctum bootstrap plan broca-agent --agent athena
sanctum bootstrap apply broca-agent --agent athena
sanctum bootstrap status broca-agent --agent athena
```

ADE calls the same verbs over local HTTP or a unix socket so we never maintain two orchestrators.

---

## 7. Open questions (hone-in fodder)

1. **Root of truth:** Does ADE talk to a long-lived control daemon, or shell out to CLI per action?
2. **Layout root:** Stick to installer canon (`/sanctum` vs `~/sanctum` vs moya’s `~/sanctum/agents/…` as lived reality)?
3. **Broca first vertical:** One agent (Athena) end-to-end before generic component catalog?
4. **Privilege:** How much can ADE trigger without root (Termux / user systemd / screen)?
5. **Secrets:** Generate in-place in module `config/.env`, never round-trip through browser storage beyond “set once”.
6. **v0 trees / ADE ship:** Does “install ADE” mean sync `public/` only, or a small Flask/proxy unit too?
7. **Packaging home:** New `sanctumos/bootstraps` repo vs folder under `installer/` vs ADE repo owning only UI?

---

## 8. Suggested hone-in path (process, not architecture)

1. Mark picks **spine preference** (A / B / C / D / hybrid) and the **first vertical** (almost certainly Broca-on-existing-Letta).
2. Freeze a one-page **bootstrap contract** (fields above).
3. Implement **two** bootstraps only: `sanctum-venv` (or no-op if present) + `broca-agent`.
4. ADE v2 slice: Host page that lists those two and toggles Broca for one agent.
5. Only then expand the catalog (SMCP, Tasks bridge, etc.).

---

## 9. Decision log

| Date | Decision |
|------|----------|
| 2026-10-15 | Stub opened; options A–D + hybrid sketched; no winner. |

---

## 10. References

- Sanctum ADE v1: repo root `README.md`, product tree `public/`
- Installer layout canon: `sanctumos/installer/docs/reference/docs-on-installer-criteria.md`
- Registry / control ideas: `sanctumos/installer/docs/reference/registry_schema.md`
- Kernel bootstraps: `sanctumos/installer/kernel-installer/sanctum_bootstrap*.sh`

# Sanctum Host OS face — first draft (2026-10-31)

**Status:** first draft for Mark review. Not implemented. Not a ship.

Tonight’s lock: ADE is the owner’s personal web client. Broca is the right way to talk to an agent. Letta is the kernel — **optional**, **never the only wire**. Engineering starts on a **host microservice** that ADE and other outside tools use to reach local Broca, SMCP, and install/uninstall. Broca-through-ADE comes **after** that face exists.

| Doc | What it is |
|-----|------------|
| [architecture-v0.md](architecture-v0.md) | Product layers, mermaid charts, stubs, engineering order |
| [api-map-v0.md](api-map-v0.md) | HTTP map, request shapes, sequence diagrams |

**Related (older, still useful):** [PRD-v2-bootstrap-installer.md](../PRD-v2-bootstrap-installer.md) — Oct 15 stub. This folder **supersedes** the “Letta face is the product face” leaning. One ADE Settings URL stays. The OS lives in Host, not inside Letta.

**Review board:** SanctumOS Tasks, directory `ade/host-os/`.

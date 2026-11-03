# Sanctum Registry + installer harness — host-os (authority)

**Status:** build authority · revised 2026-11-03 from [Doc #1643](https://tasks.decisionsciencecorp.com/admin/doc.php?id=1643)  
**Not:** a second PRD fork. Edit this tree in place when rulings change.

| Piece | Job |
|-------|-----|
| **Registry** | Hive (sysinfo, inventory, desired/actual) **plus** light ADE ↔ Broca transport. Repo: **`sanctumos/registry`**, loopback **`:8870`**. Self-serves operator/agent docs. |
| **Installer** | Separate harness (future). Polls Registry, adapts scripts, writes facts back. **Parked this phase** — no installer spike in Registry v0. |
| **Kernel** | **Letta — required.** Not optional. Optional = which *chat wire* only (default Broca via Registry; labeled direct-Letta alternate). |
| **Broca / SMCP** | Stay themselves. Registry records them; ADE talks Broca through Registry’s light transport. |

| Doc | What it is |
|-----|------------|
| [terminology-v0.md](terminology-v0.md) | Four-camp rubric + Registry vs Installer + **prime agent** |
| [architecture-v0.md](architecture-v0.md) | Layers, mermaid, engineering order (this phase) |
| [api-map-v0.md](api-map-v0.md) | Registry HTTP — `/v1/sanctum/registry/...` only |
| [cli-agent-research-v0.md](cli-agent-research-v0.md) | gptme research for **future** installer — not in Registry v0 build |

Oct 15 PRD: [PRD-v2-bootstrap-installer.md](../PRD-v2-bootstrap-installer.md) — **archive until rewritten in place.** Useful for composite-agent *nouns*; apply/adapt lives on **installer**, not inside Letta. Do not build from the old PRD body.

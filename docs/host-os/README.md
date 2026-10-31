# Sanctum Registry + installer harness — first draft (2026-10-31)

**Status:** first draft for Mark review. Not implemented. **Needs experimentation** — especially the installer harness.

| Piece | Job |
|-------|-----|
| **Registry** | Actual registry (sysinfo, inventory, desired/actual) **plus light transport** (ADE ↔ Broca loopback) |
| **Installer** | Evolve `sanctumos/installer` from a **bootstrap collection** into a **lightweight OSS harness** (occasional local devops). Polls Registry, adapts scripts. **Not Letta Code.** |
| **Kernel** | Letta — optional, never the only wire |
| **Broca / SMCP** | Stay themselves. Installer puts them on disk; Registry records them; ADE talks Broca through Registry’s light transport |

| Doc | What it is |
|-----|------------|
| [terminology-v0.md](terminology-v0.md) | Four-camp rubric + Registry vs Host vs Kernel |
| [architecture-v0.md](architecture-v0.md) | Layers, mermaid, installer evolution, engineering order |
| [api-map-v0.md](api-map-v0.md) | Registry HTTP now; installer harness later |

Oct 15 PRD: [PRD-v2-bootstrap-installer.md](../PRD-v2-bootstrap-installer.md) — still useful for composite agents and bootstrap *contracts*. Apply/adapt lives on **installer**, not inside Letta.

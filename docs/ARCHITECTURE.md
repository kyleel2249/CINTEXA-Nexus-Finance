# CINTEXA Nexus Finance — Architecture

## Pipeline

```
UPLOAD → OCR/TEXT → CLASSIFY → EXTRACT → NORMALIZE → VALIDATE
    → FINANCIAL ENGINE (ratios, health, distress, survival, scenarios, reconciliation)
    → MULTI-AGENT PANEL (audit, forensic, going-concern, CFO, …)
    → DEBATE / CONSENSUS
    → RECOMMENDATIONS & ACTION PLANS
    → REPORT / DASHBOARD / AI CFO
```

## Packages

| Package | Responsibility |
|---------|----------------|
| `@cintexa/shared` | Types, constants, source hierarchy, disclaimers |
| `@cintexa/financial-engine` | Ratios, health score, Altman/Beneish/Piotroski, survival, scenarios, reconciliation |
| `@cintexa/document-processor` | Classification, extraction, normalization, provenance |
| `@cintexa/ai-agents` | Virtual audit panel + cross-examination |
| `@cintexa/api` | Express API, orchestration, future Prisma persistence |
| `@cintexa/web` | Executive dashboard (React + Tailwind) |

## Design Principles

1. **Traceability** — every material number links to document/page/cell.
2. **Explainability** — conclusions state *why*, assumptions and confidence.
3. **No silent correction** — reconciliation surfaces variances.
4. **Probabilistic language** — survival/failure never presented as certainty.
5. **Anomaly ≠ fraud** — wording is “requires investigation”.
6. **Professional disclaimer** — always present, not obstructive.
7. **Multi-model ensemble** — no single distress model is definitive.

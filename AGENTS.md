<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aura agent entry

| Doc | Role |
|-----|------|
| [`docs/AURA_ISSUES.md`](docs/AURA_ISSUES.md) | Canonical backlog + wave order + Performance / Responsive / PWA bars |
| [`docs/ADR-dual-model-retirement.md`](docs/ADR-dual-model-retirement.md) | Project/Session language + per-entity persist |
| [`docs/PWA_SERVICE_WORKER.md`](docs/PWA_SERVICE_WORKER.md) | SW scopes, caches, media budget |
| `.cursor/rules/aura-*.mdc` | Always-apply peers: one-issue, unified-ui, design-system, responsive, PWA, copy |

One open backlog item per prompt, in wave order. UI → tokens + `components/ui` + shells. No full-studio RMW on public/hot paths.

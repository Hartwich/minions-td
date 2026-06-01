# AI Agent Guide

MinionsTD is an optional Open Party Lab game package. It is loaded by the platform through generated local registries.

## Boundaries

- Gameplay rules, scoring, timers, and round transitions live in `src/server`.
- Host rendering lives in `src/host`.
- Phone/controller layout mapping lives in `src/controller`.
- Shared game-specific socket payloads and state live in `src/protocol.ts`.
- Export only the documented package entrypoints from `package.json`.
- Do not import files from the Open Party Lab platform repo directly.

## Verification

Run:

```bash
npm run typecheck
npm run build
```

Then run the platform from `Open-Party-Lab`:

```bash
npm run games:sync-local
npm run typecheck
npm run build
```

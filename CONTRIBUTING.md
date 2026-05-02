# Contributing

## Quick start

```bash
git clone https://github.com/Paaaddy/ioBroker.ap-systems-ez1.git
cd ioBroker.ap-systems-ez1
npm install        # also runs husky prepare — installs pre-commit hook
npm run build      # compile TypeScript → build/
npm run test       # unit tests + package validation
```

Single test:
```bash
npx mocha --config test/mocharc.custom.json src/lib/ApSystemsEz1Client.test.ts --grep "retries"
```

## Branch naming

| Prefix | Use |
|--------|-----|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `ci/` | Workflow / tooling changes |
| `docs/` | Documentation only |
| `chore/` | Housekeeping (deps, config) |

## Commit format

```
<type>: <short description>

<optional body>
```

Types: `feat` `fix` `refactor` `docs` `test` `chore` `perf` `ci`

## Config field sync requirement

Adding an adapter config field requires updating **three** places in lockstep or the adapter will fail validation:

1. `admin/jsonConfig.json` — UI schema
2. `src/lib/adapter-config.d.ts` — TypeScript type augmentation
3. `io-package.json` `native` — default values

## Debugging locally

**Mock device responses** (unit tests):
```typescript
axiosGetStub.resolves({ status: 200, data: { data: { p1: 100, p2: 50, e1: 1.2, ... }, message: "", deviceId: "ABC" } });
```
Stub target is `axios.create` return value, not `axios.get` directly — see `ApSystemsEz1Client.test.ts` for the pattern.

**Against a real device**: set `ipAddress` and `port` in ioBroker admin, then run `npm run test:integration`. Requires a live ioBroker instance on the same LAN as the inverter.

**Log level**: set adapter log level to `debug` in ioBroker admin to see raw HTTP responses.

## Release runbook (happy path)

1. `npm run release patch` (or `minor`) — bumps `package.json`, `io-package.json` news, README changelog
2. Merge the release-please PR that appears on `main`
3. GitHub Actions publishes to npm automatically on merge

## Rollback runbook

Trigger `.github/workflows/rollback.yml` via GitHub Actions → `workflow_dispatch`:

| Scenario | When | Effect |
|----------|------|--------|
| A | Bad version on npm `latest`, not yet in ioBroker stable repo | Re-points `latest` dist-tag; deprecates bad version |
| B | Bad version already merged into ioBroker stable repo | Same as A + opens revert PR on `ioBroker/ioBroker.repositories` |
| C | Bad beta only (`beta` dist-tag) | Removes `beta` dist-tag |

All three scenarios create a tracking issue in this repo.

## Promote to stable

Once a version has been on npm `latest` for ≥ 21 days with ≤ 2 open bugs and `npx @iobroker/repochecker` passes with zero errors, trigger `.github/workflows/promote-stable.yml` with the version number. The workflow validates the gates and opens a PR on `ioBroker/ioBroker.repositories`.

## CI notes

The CI `paths-ignore` list excludes `.github/**` — workflow-only PRs skip CI entirely by design (cost saving). If you need to validate a workflow change, push a trivial `src/` change alongside it or test in a fork.

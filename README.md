![Logo](admin/ap-systems-ez1.png)

# ioBroker.ap-systems-ez1

[![CI](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/actions/workflows/ci.yml/badge.svg)](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Fork** of [tobiasexner/ioBroker.ap-systems-ez1](https://github.com/tobiasexner/ioBroker.ap-systems-ez1) by [Tobias Exner](https://github.com/tobiasexner). Original implementation is his. This fork adds write API support (power limit + on/off control) and an improved CI pipeline.

---

## What it does

Connects ioBroker to an **APsystems EZ1 microinverter** over the local network using the device's built-in HTTP API. Polls the inverter on a configurable interval and exposes readings as ioBroker states. Supports reading live power and energy data, and writing the power cap and on/off state directly to the device.

---

## Requirements

- APsystems EZ1 microinverter with local API accessible on your LAN
- ioBroker instance on the same network as the inverter
- Node.js ≥ 16 (tested: 20, 22)

---

## Installation

Install via the ioBroker Admin interface: search for `ap-systems-ez1`.

---

## Configuration

| Field | Description | Default |
|---|---|---|
| IP Address | Local IP of the EZ1 inverter | — |
| Port | HTTP API port | `8050` |
| Poll interval (s) | How often to read from the device | `60` |
| Ignore connection errors | Suppress log spam when inverter is offline (e.g. at night) | `false` |

---

## States

### Read-only

| State | Type | Unit | Description |
|---|---|---|---|
| `DeviceInfo.DeviceId` | string | — | Device serial number |
| `DeviceInfo.DevVer` | string | — | Firmware version |
| `DeviceInfo.Ssid` | string | — | Connected Wi-Fi SSID |
| `DeviceInfo.IpAddr` | string | — | Device IP address |
| `DeviceInfo.MaxPower` | number | W | Device max power cap |
| `DeviceInfo.MinPower` | number | W | Device min power cap |
| `OutputData.CurrentPower_1/2/Total` | number | W | Live power per channel and combined |
| `OutputData.EnergyToday_1/2/Total` | number | kWh | Energy generated today |
| `OutputData.EnergyLifetime_1/2/Total` | number | kWh | Lifetime energy |
| `AlarmInfo.OffGrid` | string | — | `Normal` / `Alarm` |
| `AlarmInfo.ShortCircuitError_1/2` | string | — | `Normal` / `Alarm` |
| `AlarmInfo.OutputFault` | string | — | `Normal` / `Alarm` |
| `connected` | boolean | — | `true` when last poll succeeded |

### Writable

Writing `ack: false` sends a live command to the inverter.

| State | Type | Values | Command |
|---|---|---|---|
| `OnOffStatus.OnOffStatus` | boolean | `true` = on, `false` = off | `GET /setOnOff?status=0\|1` |
| `MaxPower.MaxPower` | number | watts (within device min/max) | `GET /setMaxPower?p=<n>` |

---

## Device API

The EZ1 exposes a local HTTP API on port 8050. Full spec: [`api/openapi.yaml`](api/openapi.yaml).

| Endpoint | Description |
|---|---|
| `GET /getDeviceInfo` | Identity, firmware, network, power limits |
| `GET /getOutputData` | Real-time power and energy per channel |
| `GET /getMaxPower` | Current max power cap |
| `GET /setMaxPower?p=<n>` | Set max power cap (W) |
| `GET /getAlarm` | Fault flags |
| `GET /getOnOff` | On/off status |
| `GET /setOnOff?status=0\|1` | Set on (`0`) or off (`1`) |

---

## Development

### Scripts

```bash
npm run build          # compile TypeScript → build/
npm run watch          # compile in watch mode
npm run test           # unit tests + package validation
npm run test:ts        # unit tests only
npm run check          # TypeScript type check
npm run lint           # ESLint
npm run translate      # sync i18n files
```

### CI pipeline

| Workflow | Trigger | Purpose |
|---|---|---|
| **CI** | Push / PR to `main` (code only) | Lint and type-check. Skipped for markdown, docs, and workflow-only changes. |
| **Release Please** | Push to `main` | Opens a Release PR from conventional commits. Merging creates the GitHub Release and tag. |
| **Auto-merge** | Dependabot PRs or PRs labeled `automerge-release` | Merges qualifying PRs automatically after CI passes. |
| **Dependabot** | Weekly | Opens PRs for npm and GitHub Actions updates. |
| **Soak Monitor** | Weekly + manual | Checks download trend and open bug count during soak periods. |
| **Rollback** | Manual | Re-points npm dist-tag, deprecates bad version, opens revert PR to ioBroker.repositories. |
| **Promote to Stable** | Manual | Opens PR to ioBroker.repositories after validating soak, repochecker, and bug count gates. |

Required secret: `RELEASE_PLEASE_TOKEN` — fine-grained PAT on `LeoTronick/ioBroker.ap-systems-ez1` with **Contents: Read & Write**, **Pull requests: Read & Write**, **Workflows: Read & Write**. Falls back to `GITHUB_TOKEN` if not set (CI won't run on the release commit in that case).

---

## Troubleshooting

**`State value to set for "OnOffStatus.OnOffStatus" has to be type "string" but received type "boolean"`**

Stale state object from a pre-0.1.0 install. The state was previously typed as `string`; the adapter now stores a `boolean`. Upgrade to 0.1.1+ — the fix uses `setObjectAsync` instead of `extendObjectAsync` so the schema is corrected on adapter start.

**`MaxPower rejected: device power limits not yet loaded` / `device power limits unavailable`**

The adapter couldn't load min/max power limits from the device (device unreachable at startup or at the time of the write). Check network connectivity to the inverter and retry once the device is online.

---

## Changelog

### Unreleased

- Fix: `OnOffStatus.OnOffStatus` type migration — upgrades from older installs no longer see "has to be type string but received type boolean" on every poll ([#6](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/issues/6))

### 0.1.0 (2026-04-18)

- Add write API: `OnOffStatus.OnOffStatus` (boolean) and `MaxPower.MaxPower` (number) writable states
- Add `connected` boolean state (updated on every poll success/failure across all five poll methods)
- Hardware safety: write commands use fail-fast path (no retries) — prevents duplicate commands if response times out
- Hardware safety: write queue serializes all writes via Promise chain — rapid toggles cannot race
- Hardware safety: post-write verification polls device 2s after write; reverts local state to device reality on mismatch
- Hardware safety: `net.isIPv4()` IP validation (validates each octet 0–255)
- Hardware safety: `Number.isFinite()` guards on DeviceInfo limits, OutputData fields, and MaxPower before writing state
- Hardware safety: null-guard on response envelope `data` field before destructuring
- Hardware safety: initial polls awaited before `subscribeStates` so device limits are loaded before first write accepted
- Add HTTP keep-alive connection pooling (`http.Agent`) and exponential backoff retry on read endpoints (3 attempts: 100/200/400ms)
- Parallelize state writes via `Promise.all()`
- Add 23 unit tests, 100% branch + statement coverage on `ApSystemsEz1Client`
- Add CI pipeline: lint, test, release-please, dependabot, soak monitor, rollback, promote-stable workflows
- Reduce CI matrix to ubuntu + Node 20/22 (dropped macOS, Windows, Node 18 EOL)

### 0.0.2 (2024-06-19)

- (tobiasexner) Fix: ioBroker reports error when inverter is offline (#14)

### 0.0.1 (2024-01-03)

- (tobiasexner) Initial release

---

## AI Disclosure

Parts of the code and CI pipeline in this fork were written or optimized with the assistance of [Claude Code](https://claude.ai/code) (Anthropic). All generated output has been reviewed and tested by the maintainer.

---

## License

MIT — see [LICENSE](LICENSE).

Copyright (c) 2024 Tobias Exner (original author)
Copyright (c) 2026 Leotronick / Paaaddy (fork maintainer)

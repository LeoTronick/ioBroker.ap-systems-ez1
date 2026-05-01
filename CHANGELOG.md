# Changelog

All notable changes to this project will be documented in this file.
Release-please manages this file for versions after 0.1.0.

## [0.2.0](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/compare/v0.1.0...v0.2.0) (2026-04-28)


### Features

* write API, hardware safety hardening, performance, and CI overhaul ([76251af](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/commit/76251aff14526606c78fb701e3fa82f381e221f5))
* write API, hardware safety hardening, performance, and CI overhaul ([281d9cb](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/commit/281d9cb886cbf729b3a4fdb2d3fd848520494bfd))


### Bug Fixes

* **#6:** use setObjectAsync to fix state type migration on upgrade ([1cd56cf](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/commit/1cd56cf9355d2f4a415f4e08df28f6fae847861f))
* add units to power states and fix MaxPower write handling ([6f6fed6](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/commit/6f6fed6a24480d61d40f3c05e64129eea726975e))
* add units to power states and fix MaxPower write handling ([8fd8086](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/commit/8fd80863e22c99579d66d2969d5571d1560afb0d))
* remove windows CI runner and drop workflows:write permission ([1539d01](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/commit/1539d0121dd19fbb1b2e13397852fcfa68e2926d))
* remove Windows CI runner and drop workflows:write permission ([41ae62b](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/commit/41ae62bf7a57380e662fc5e298d9dad3a5271c95))
* replace extendObjectAsync with setObjectAsync to fix type migration ([3165891](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/commit/31658916220a8daf6ef4b847ab68d51bee83b3de)), closes [#6](https://github.com/LeoTronick/ioBroker.ap-systems-ez1/issues/6)

## [0.1.0] - 2026-04-18

### Added
- Write API: `OnOffStatus.OnOffStatus` (boolean) and `MaxPower.MaxPower` (number) writable states
- `connected` boolean state updated on every poll success/failure
- Hardware safety: fail-fast write path (no retries) prevents duplicate device commands
- Hardware safety: write queue serializes writes via Promise chain — rapid toggles cannot race
- Hardware safety: post-write verification polls device 2 s after write; reverts local state on mismatch
- Hardware safety: `net.isIPv4()` IP validation
- Hardware safety: `Number.isFinite()` guards on all numeric state writes
- Hardware safety: null-guard on response envelope before destructuring
- Hardware safety: initial polls awaited before `subscribeStates` so device limits load before first write
- HTTP keep-alive connection pooling (`http.Agent`) and exponential backoff retry on read endpoints (3 attempts: 100/200/400 ms)
- Parallelized state writes via `Promise.all()`
- 23 unit tests, 100% branch + statement coverage on `ApSystemsEz1Client`
- CI pipeline: lint, type-check, release-please, dependabot, soak monitor, rollback, promote-stable

## [0.0.2] - 2024-06-19

### Fixed
- ioBroker reports error when inverter is offline (#14) — by tobiasexner

## [0.0.1] - 2024-01-03

### Added
- Initial release — by tobiasexner

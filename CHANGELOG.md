# Changelog

All notable changes to this project will be documented in this file.
Release-please manages this file for versions after 0.1.0.

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

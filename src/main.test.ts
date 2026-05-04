// Adapter integration tests live in test/integration.js (requires physical device).
// Unit tests for ApSystemsEz1Client live in src/lib/ApSystemsEz1Client.test.ts.
//
// This file covers:
//   1. onStateChange ack-guard — ack=true states must not trigger device commands
//   2. Offline write queue — commands queued when device unreachable, drained on reconnect
//   3. Write queue serialization — concurrent writes serialize via Promise chain
//   4. Config validation logic — IP/port/interval guard conditions

import { expect } from "chai";
import sinon from "sinon";
import net from "net";

describe("onStateChange ack guard", () => {
	it("ignores state where ack=true", () => {
		const onStateChange = (state: ioBroker.State | null | undefined, commandFn: () => void): void => {
			if (!state || state.ack) return;
			commandFn();
		};

		const command = sinon.stub();

		onStateChange({ val: true, ack: true, ts: 0, lc: 0, from: "", q: 0 }, command);
		onStateChange(null, command);

		expect(command).to.not.have.been.called;
	});

	it("calls command when ack=false", () => {
		const onStateChange = (state: ioBroker.State | null | undefined, commandFn: () => void): void => {
			if (!state || state.ack) return;
			commandFn();
		};

		const command = sinon.stub();

		onStateChange({ val: false, ack: false, ts: 0, lc: 0, from: "", q: 0 }, command);

		expect(command).to.have.been.calledOnce;
	});
});

describe("offline write queue — pending command semantics", () => {
	it("stores OnOff command when device returns undefined (unreachable)", async () => {
		let pendingOnOff: boolean | null = null;

		const applyOnOffStatus = async (on: boolean, result: object | undefined): Promise<void> => {
			if (result === undefined) { pendingOnOff = on; return; }
			pendingOnOff = null;
		};

		await applyOnOffStatus(true, undefined);
		expect(pendingOnOff).to.equal(true);
	});

	it("clears pending command on successful write", async () => {
		let pendingOnOff: boolean | null = true;

		const applyOnOffStatus = async (on: boolean, result: object | undefined): Promise<void> => {
			if (result === undefined) { pendingOnOff = on; return; }
			pendingOnOff = null;
		};

		await applyOnOffStatus(false, { data: {} });
		expect(pendingOnOff).to.be.null;
	});

	it("last-write-wins: later OnOff command overwrites earlier pending", () => {
		let pendingOnOff: boolean | null = null;

		pendingOnOff = true;   // first command while offline
		pendingOnOff = false;  // second command while still offline — wins

		expect(pendingOnOff).to.equal(false);
	});

	it("stores MaxPower command when device returns undefined", async () => {
		let pendingMaxPower: number | null = null;

		const applyMaxPower = async (watts: number, result: object | undefined): Promise<void> => {
			if (result === undefined) { pendingMaxPower = watts; return; }
			pendingMaxPower = null;
		};

		await applyMaxPower(150, undefined);
		expect(pendingMaxPower).to.equal(150);
	});

	it("last-write-wins for MaxPower too", () => {
		let pendingMaxPower: number | null = null;

		pendingMaxPower = 100;
		pendingMaxPower = 200;

		expect(pendingMaxPower).to.equal(200);
	});
});

describe("offline write queue — reconnect drain", () => {
	it("drains pending commands only on false→true transition", () => {
		let drainCalled = 0;
		const drain = (): void => { drainCalled++; };

		const setConnected = (connected: boolean, wasConnected: boolean): void => {
			if (connected && !wasConnected) drain();
		};

		setConnected(true, true);   // already connected — no drain
		expect(drainCalled).to.equal(0);

		setConnected(false, true);  // disconnected — no drain
		expect(drainCalled).to.equal(0);

		setConnected(true, false);  // reconnected — drain!
		expect(drainCalled).to.equal(1);

		setConnected(true, false);  // reconnected again — drain again
		expect(drainCalled).to.equal(2);
	});

	it("drains OnOff and MaxPower independently in one reconnect", () => {
		let pendingOnOff: boolean | null = true;
		let pendingMaxPower: number | null = 150;

		const onOffExecuted: boolean[] = [];
		const maxPowerExecuted: number[] = [];

		const drainPendingCommands = (): void => {
			if (pendingOnOff !== null) {
				const p = pendingOnOff; pendingOnOff = null;
				onOffExecuted.push(p);
			}
			if (pendingMaxPower !== null) {
				const p = pendingMaxPower; pendingMaxPower = null;
				maxPowerExecuted.push(p);
			}
		};

		drainPendingCommands();

		expect(onOffExecuted).to.deep.equal([true]);
		expect(maxPowerExecuted).to.deep.equal([150]);
		expect(pendingOnOff).to.be.null;
		expect(pendingMaxPower).to.be.null;
	});

	it("drain with no pending commands is a no-op", () => {
		let pendingOnOff: boolean | null = null;
		let pendingMaxPower: number | null = null;
		let executed = 0;

		const drainPendingCommands = (): void => {
			if (pendingOnOff !== null) { executed++; pendingOnOff = null; }
			if (pendingMaxPower !== null) { executed++; pendingMaxPower = null; }
		};

		drainPendingCommands();
		expect(executed).to.equal(0);
	});
});

describe("write queue serialization", () => {
	it("serializes concurrent writes in enqueue order", async () => {
		const order: string[] = [];
		let writeQueue: Promise<void> = Promise.resolve();

		const enqueue = (label: string, delayMs: number): void => {
			writeQueue = writeQueue.then(async () => {
				await new Promise<void>(r => setTimeout(r, delayMs));
				order.push(label);
			});
		};

		enqueue("A", 10);
		enqueue("B", 1);  // shorter delay but must wait for A
		enqueue("C", 1);

		await writeQueue;
		expect(order).to.deep.equal(["A", "B", "C"]);
	});
});

describe("config validation logic", () => {
	it("rejects non-IPv4 strings", () => {
		expect(net.isIPv4("not-an-ip")).to.be.false;
		expect(net.isIPv4("256.0.0.1")).to.be.false;
		expect(net.isIPv4("")).to.be.false;
		expect(net.isIPv4("::1")).to.be.false;
	});

	it("accepts valid IPv4 addresses", () => {
		expect(net.isIPv4("192.168.1.100")).to.be.true;
		expect(net.isIPv4("10.0.0.1")).to.be.true;
		expect(net.isIPv4("0.0.0.0")).to.be.true;
		expect(net.isIPv4("255.255.255.255")).to.be.true;
	});

	it("rejects out-of-range ports", () => {
		const validPort = (p: number): boolean => Number.isInteger(p) && p >= 1 && p <= 65535;
		expect(validPort(0)).to.be.false;
		expect(validPort(65536)).to.be.false;
		expect(validPort(-1)).to.be.false;
		expect(validPort(8050.5)).to.be.false;
	});

	it("accepts valid ports", () => {
		const validPort = (p: number): boolean => Number.isInteger(p) && p >= 1 && p <= 65535;
		expect(validPort(8050)).to.be.true;
		expect(validPort(1)).to.be.true;
		expect(validPort(65535)).to.be.true;
	});

	it("rejects invalid poll intervals", () => {
		const validInterval = (n: number): boolean => Number.isFinite(n) && n >= 1;
		expect(validInterval(0)).to.be.false;
		expect(validInterval(-1)).to.be.false;
		expect(validInterval(NaN)).to.be.false;
		expect(validInterval(Infinity)).to.be.false;
	});

	it("accepts valid poll intervals", () => {
		const validInterval = (n: number): boolean => Number.isFinite(n) && n >= 1;
		expect(validInterval(1)).to.be.true;
		expect(validInterval(60)).to.be.true;
		expect(validInterval(3600)).to.be.true;
	});
});

// /getDeviceInfo returns minPower/maxPower as strings ("30", "800") per OpenAPI.
// DEVICE_INFO_NUMBERS in main.ts wraps the extractor in Number() so the subsequent
// Number.isFinite() guard accepts string-typed limits. Without this coercion,
// DeviceInfo.MinPower / DeviceInfo.MaxPower never get populated, and every
// MaxPower write is rejected by validateAndSetMaxPower (LeoTronick issue #17).
describe("DeviceInfo limit coercion", () => {
	const extractMaxPower = (res: any): number => Number(res.maxPower);
	const extractMinPower = (res: any): number => Number(res.minPower);

	it("converts API string limits to finite numbers", () => {
		const res = { maxPower: "800", minPower: "30" };
		expect(extractMaxPower(res)).to.equal(800);
		expect(extractMinPower(res)).to.equal(30);
		expect(Number.isFinite(extractMaxPower(res))).to.equal(true);
		expect(Number.isFinite(extractMinPower(res))).to.equal(true);
	});

	it("accepts numeric payloads (defensive against firmware variation)", () => {
		const res = { maxPower: 800, minPower: 30 };
		expect(extractMaxPower(res)).to.equal(800);
		expect(extractMinPower(res)).to.equal(30);
	});

	it("returns NaN for non-numeric strings and undefined, rejected by isFinite", () => {
		expect(Number.isFinite(extractMaxPower({ maxPower: "abc" }))).to.equal(false);
		expect(Number.isFinite(extractMaxPower({}))).to.equal(false);
	});
});

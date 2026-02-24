'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const HealthMonitor = require('./HealthMonitor');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_CONFIG = {
  wizardUrl: 'http://localhost:3000',
  dashboardUrl: 'http://localhost:8080',
};

function makeMonitor(onStatusChange) {
  return new HealthMonitor(TEST_CONFIG, onStatusChange || (() => {}));
}

// Stub _checkEndpoint on an instance to return a fixed sequence of values
function stubEndpoints(monitor, wizardResults, dashboardResults) {
  let wizardIdx = 0;
  let dashboardIdx = 0;
  monitor._checkEndpoint = (url) => {
    if (url.includes(':3000')) {
      const val = wizardResults[wizardIdx];
      wizardIdx = Math.min(wizardIdx + 1, wizardResults.length - 1);
      return Promise.resolve(val);
    }
    const val = dashboardResults[dashboardIdx];
    dashboardIdx = Math.min(dashboardIdx + 1, dashboardResults.length - 1);
    return Promise.resolve(val);
  };
}

// ─── _poll change detection ───────────────────────────────────────────────────

describe('HealthMonitor._poll', () => {
  it('fires callback with correct status on first poll', async () => {
    const calls = [];
    const monitor = makeMonitor((s) => calls.push(s));
    stubEndpoints(monitor, [true], [true]);

    await monitor._poll();

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { wizard: true, dashboard: true });
  });

  it('does not fire callback when status is unchanged', async () => {
    const calls = [];
    const monitor = makeMonitor((s) => calls.push(s));
    stubEndpoints(monitor, [true, true], [true, true]);

    await monitor._poll(); // first: triggers callback
    await monitor._poll(); // second: same status, no callback

    assert.equal(calls.length, 1);
  });

  it('fires callback when wizard goes from healthy to unhealthy', async () => {
    const calls = [];
    const monitor = makeMonitor((s) => calls.push(s));
    stubEndpoints(monitor, [true, false], [true, true]);

    await monitor._poll(); // { wizard: true, dashboard: true }
    await monitor._poll(); // { wizard: false, dashboard: true } — change

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], { wizard: false, dashboard: true });
  });

  it('fires callback when dashboard goes from healthy to unhealthy', async () => {
    const calls = [];
    const monitor = makeMonitor((s) => calls.push(s));
    stubEndpoints(monitor, [true, true], [true, false]);

    await monitor._poll();
    await monitor._poll();

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], { wizard: true, dashboard: false });
  });

  it('fires callback when both go down simultaneously', async () => {
    const calls = [];
    const monitor = makeMonitor((s) => calls.push(s));
    stubEndpoints(monitor, [true, false], [true, false]);

    await monitor._poll();
    await monitor._poll();

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], { wizard: false, dashboard: false });
  });

  it('fires callback again when services recover', async () => {
    const calls = [];
    const monitor = makeMonitor((s) => calls.push(s));
    stubEndpoints(monitor, [true, false, true], [true, false, true]);

    await monitor._poll(); // up
    await monitor._poll(); // down
    await monitor._poll(); // up again

    assert.equal(calls.length, 3);
    assert.deepEqual(calls[2], { wizard: true, dashboard: true });
  });

  it('starts with lastStatus {wizard:false, dashboard:false}', () => {
    const monitor = makeMonitor();
    assert.deepEqual(monitor.getLastStatus(), { wizard: false, dashboard: false });
  });
});

// ─── _checkEndpoint ───────────────────────────────────────────────────────────

describe('HealthMonitor._checkEndpoint', () => {
  it('resolves false for a connection-refused URL (no server running)', async () => {
    const monitor = makeMonitor();
    // Port 1 is almost certainly not listening
    const result = await monitor._checkEndpoint('http://localhost:1/health');
    assert.equal(result, false);
  });

  it('does not throw on connection refused', async () => {
    const monitor = makeMonitor();
    await assert.doesNotReject(() => monitor._checkEndpoint('http://localhost:1/'));
  });
});

// ─── pollNow ─────────────────────────────────────────────────────────────────

describe('HealthMonitor.pollNow', () => {
  it('returns undefined (fire-and-forget, not a Promise callers can await)', () => {
    const monitor = makeMonitor();
    stubEndpoints(monitor, [false], [false]);
    const result = monitor.pollNow();
    assert.equal(result, undefined);
  });

  it('triggers a poll that eventually updates lastStatus', async () => {
    const calls = [];
    const monitor = makeMonitor((s) => calls.push(s));
    stubEndpoints(monitor, [true], [true]);

    monitor.pollNow();
    // Give the async poll a tick to complete
    await new Promise((r) => setImmediate(r));

    assert.equal(calls.length, 1);
    assert.deepEqual(monitor.getLastStatus(), { wizard: true, dashboard: true });
  });
});

// ─── start / stop ─────────────────────────────────────────────────────────────

describe('HealthMonitor.start/stop', () => {
  let monitor;
  afterEach(() => { if (monitor) monitor.stop(); });

  it('stop() clears the interval (no further polls after stop)', async () => {
    let pollCount = 0;
    monitor = makeMonitor();
    monitor._checkEndpoint = () => { pollCount++; return Promise.resolve(false); };

    monitor.start();
    monitor.stop();

    const countAfterStop = pollCount;
    await new Promise((r) => setTimeout(r, 50));
    // No more polls should have fired after stop
    assert.equal(pollCount, countAfterStop);
  });

  it('getLastStatus() returns a copy, not the internal reference', () => {
    monitor = makeMonitor();
    const s1 = monitor.getLastStatus();
    s1.wizard = true; // mutate the copy
    assert.equal(monitor.getLastStatus().wizard, false); // internal state unchanged
  });
});

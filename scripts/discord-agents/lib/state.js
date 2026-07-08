// Shared coordination state for the multi-agent Discord layer.
//
// All agent processes run on the same host, so we coordinate through a single
// JSON file guarded by a lockfile. The state holds:
//   - chainId / hops : the current auto-chaining budget (reset by a founder msg)
//   - frozen         : global kill switch (spend limit or /freeze)
//   - running        : concurrency counter (cap simultaneous claude invocations)
//   - ledger         : accumulated spend (session + daily, daily auto-resets)
//
// Cross-process races are possible but rare at this volume (one founder, a few
// bots); the lockfile keeps each read-modify-write atomic, and a 5s stale-lock
// breaker prevents a crashed process from wedging the others.

import { readFileSync, writeFileSync, openSync, closeSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

function defaults() {
  return {
    chainId: null,
    hops: 0,
    frozen: false,
    running: 0,
    ledger: { day: today(), sessionUsd: 0, dailyUsd: 0 }
  };
}

export function makeStore(stateDir) {
  mkdirSync(stateDir, { recursive: true });
  const statePath = join(stateDir, 'state.json');
  const lockPath = join(stateDir, 'state.lock');

  function readRaw() {
    try {
      const s = JSON.parse(readFileSync(statePath, 'utf8'));
      return { ...defaults(), ...s, ledger: { ...defaults().ledger, ...(s.ledger || {}) } };
    } catch {
      return defaults();
    }
  }

  async function acquireLock() {
    const start = Date.now();
    for (;;) {
      try {
        closeSync(openSync(lockPath, 'wx'));
        return;
      } catch {
        if (Date.now() - start > 5000) {
          try { unlinkSync(lockPath); } catch {}
        }
        await sleep(20);
      }
    }
  }
  function releaseLock() { try { unlinkSync(lockPath); } catch {} }

  // Atomic read-modify-write. `fn(state)` mutates state in place and may return
  // a value, which is returned to the caller.
  async function update(fn) {
    await acquireLock();
    try {
      const s = readRaw();
      if (s.ledger.day !== today()) { s.ledger.day = today(); s.ledger.dailyUsd = 0; }
      const r = fn(s);
      writeFileSync(statePath, JSON.stringify(s, null, 2));
      return r;
    } finally {
      releaseLock();
    }
  }

  return {
    statePath,
    read: readRaw,
    update,

    // A founder message starts a fresh chain — auto-chaining budget resets.
    startChain: (chainId) => update((s) => { s.chainId = chainId; s.hops = 0; }),

    // A bot-triggered turn consumes one hop. Returns { ok, hops }.
    registerHop: (budget) => update((s) => {
      s.hops += 1;
      return { ok: s.hops <= budget, hops: s.hops };
    }),

    addSpend: (usd, { sessionLimit, dailyLimit }) => update((s) => {
      s.ledger.sessionUsd += usd || 0;
      s.ledger.dailyUsd += usd || 0;
      if ((sessionLimit && s.ledger.sessionUsd >= sessionLimit) ||
          (dailyLimit && s.ledger.dailyUsd >= dailyLimit)) {
        s.frozen = true;
      }
      return { frozen: s.frozen, sessionUsd: s.ledger.sessionUsd, dailyUsd: s.ledger.dailyUsd };
    }),

    setFrozen: (v) => update((s) => { s.frozen = !!v; }),

    resetAll: () => update((s) => {
      s.chainId = null; s.hops = 0; s.frozen = false; s.running = 0;
      s.ledger = { day: today(), sessionUsd: 0, dailyUsd: 0 };
    }),

    // Concurrency semaphore across all agent processes.
    acquireSlot: async (cap) => {
      for (;;) {
        const got = await update((s) => {
          if (s.running < cap) { s.running += 1; return true; }
          return false;
        });
        if (got) return;
        await sleep(500);
      }
    },
    releaseSlot: () => update((s) => { s.running = Math.max(0, s.running - 1); })
  };
}

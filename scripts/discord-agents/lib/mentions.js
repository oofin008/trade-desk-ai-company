// Mention glue — the piece that lets agents trigger each other.
//
// Each bot, once connected, writes its own Discord user id into a shared
// ids.json (name -> botUserId). With that map we can:
//   - rewriteOutgoing : turn an agent's "@head-of-trading" text into a real
//                       Discord ping <@id>, so that bot's gateway actually fires
//   - humanizeMentions: turn incoming <@id> pings back into "@name" so the
//                       prompt reads naturally for the agent
//   - addressedToMe / mentionedNames: routing helpers

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function loadRoster(dir) {
  return JSON.parse(readFileSync(join(dir, 'roster.json'), 'utf8'));
}

export function makeIdStore(stateDir) {
  mkdirSync(stateDir, { recursive: true });
  const p = join(stateDir, 'ids.json');
  const load = () => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; } };
  const setOwn = (name, id) => {
    const m = load();
    m[name] = id;
    writeFileSync(p, JSON.stringify(m, null, 2));
  };
  return { load, setOwn, path: p };
}

export function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// @name (plain text) -> <@id> (real ping). Longest names first so
// "head-of-trading" isn't partially eaten by a shorter alias.
export function rewriteOutgoing(text, ids) {
  let out = text;
  for (const name of Object.keys(ids).sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(?<![\\w<@/])@${escapeRe(name)}\\b`, 'g');
    out = out.replace(re, `<@${ids[name]}>`);
  }
  return out;
}

// <@id> / <@!id> -> @name (for readability when feeding a message into a prompt).
export function humanizeMentions(text, ids) {
  let out = text;
  for (const [name, id] of Object.entries(ids)) {
    out = out.split(`<@${id}>`).join(`@${name}`).split(`<@!${id}>`).join(`@${name}`);
  }
  return out;
}

// Which agent (by name) does this discord user id belong to? Reverse lookup.
export function nameForId(id, ids) {
  for (const [name, uid] of Object.entries(ids)) if (uid === id) return name;
  return null;
}

// Does this message address `name` — either via a real Discord mention of that
// bot, or a plain "@name" / "@displayName" text token (founder may not click the
// autocomplete)?
export function addressesName(message, name, ownUserId, displayName) {
  if (ownUserId && message.mentions?.users?.has(ownUserId)) return true;
  const c = message.content || '';
  const tokens = [name, displayName].filter(Boolean);
  return tokens.some((t) => new RegExp(`(?<![\\w])@${escapeRe(t)}\\b`, 'i').test(c));
}

// Does the message mention ANY known agent (real ping or @name text token)?
// `names` defaults to the registered ids, but pass the full roster so the
// default agent yields to a named-but-offline peer instead of grabbing it.
export function mentionsAnyAgent(message, ids, names = Object.keys(ids)) {
  if (message.mentions?.users?.size > 0) {
    for (const id of Object.values(ids)) if (message.mentions.users.has(id)) return true;
  }
  const c = message.content || '';
  return names.some((n) => new RegExp(`(?<![\\w])@${escapeRe(n)}\\b`, 'i').test(c));
}

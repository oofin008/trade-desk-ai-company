// Pure helpers around [[JOB agent=...]]...[[/JOB]] markers, split out of
// agent-runner.js so they're testable without spinning up Discord/claude
// (see issue #1 — the runner-integration side isn't practical to unit test).

// Parse [[JOB agent=name]]...[[/JOB]] blocks out of a turn's final reply.
// Returns the reply with those blocks stripped, plus the parsed jobs.
export function extractJobs(text) {
  const jobs = [];
  const cleaned = text.replace(/\[\[JOB agent=([\w-]+)\]\]\s*([\s\S]*?)\[\[\/JOB\]\]/g, (_, agent, body) => {
    const prompt = body.trim();
    if (prompt) jobs.push({ agent, prompt });
    return '';
  }).trim();
  return { text: cleaned, jobs };
}

// Parse a [[SUMMARY]]...[[/SUMMARY]] block from a specialist job's final
// reply (see runSpecialistJob's preamble in agent-runner.js, which asks every
// job for one). Only this block gets folded back into the dispatching head's
// resumed session — the full reply is shown to the human but not retained —
// so a session's context stops growing by the size of every job's full output
// and grows only by this bounded summary instead. Returns the reply with the
// block stripped (for display) and the block's contents (or null if the
// specialist didn't include one, e.g. it forgot — the caller decides the
// fallback).
export function extractSummary(text) {
  let summary = null;
  const cleaned = text.replace(/\[\[SUMMARY\]\]([\s\S]*?)\[\[\/SUMMARY\]\]/, (_, body) => {
    summary = body.trim();
    return '';
  }).trim();
  return { text: cleaned, summary };
}

// Guard against unbounded job-followup chains (trader -> quant-researcher -> ... -> forever).
// depth is the depth of the job about to be dispatched (0 = the original,
// top-level job); maxDepth defaults to MAX_JOB_CHAIN_DEPTH's value in
// agent-runner.js. Kept in sync manually since this file has no other deps.
export function canChainJob(depth, maxDepth = 3) {
  return depth + 1 <= maxDepth;
}

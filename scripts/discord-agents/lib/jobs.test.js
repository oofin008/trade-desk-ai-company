import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractJobs, extractSummary, canChainJob } from './jobs.js';

test('extractJobs: one job block', () => {
  const input = 'Dispatching now.\n[[JOB agent=dev]]\nImplement task 4.\n[[/JOB]]';
  const { text, jobs } = extractJobs(input);
  assert.equal(text, 'Dispatching now.');
  assert.deepEqual(jobs, [{ agent: 'dev', prompt: 'Implement task 4.' }]);
});

test('extractJobs: multiple job blocks', () => {
  const input = [
    'Chaining two.',
    '[[JOB agent=dev]]',
    'Do the dev work.',
    '[[/JOB]]',
    '[[JOB agent=qa]]',
    'Review the dev work.',
    '[[/JOB]]'
  ].join('\n');
  const { text, jobs } = extractJobs(input);
  assert.equal(text, 'Chaining two.');
  assert.deepEqual(jobs, [
    { agent: 'dev', prompt: 'Do the dev work.' },
    { agent: 'qa', prompt: 'Review the dev work.' }
  ]);
});

test('extractJobs: no job markers passes text through unchanged (aside from trim)', () => {
  const input = 'Just a normal reply with no job markers.';
  const { text, jobs } = extractJobs(input);
  assert.equal(text, input);
  assert.deepEqual(jobs, []);
});

test('extractJobs: empty-body job block is dropped (no job, marker stripped)', () => {
  const input = 'Done for now.\n[[JOB agent=dev]]\n\n[[/JOB]]';
  const { text, jobs } = extractJobs(input);
  assert.equal(text, 'Done for now.');
  assert.deepEqual(jobs, []);
});

test('extractJobs: leading/trailing whitespace around surviving text is trimmed', () => {
  const input = '  \n  Some reply text.  \n  [[JOB agent=dev]]\nwork\n[[/JOB]]\n  ';
  const { text, jobs } = extractJobs(input);
  assert.equal(text, 'Some reply text.');
  assert.deepEqual(jobs, [{ agent: 'dev', prompt: 'work' }]);
});

test('extractSummary: strips the block and returns its contents', () => {
  const input = 'Implemented task 4, all tests pass.\n[[SUMMARY]]\nPASS. Changed src/foo.js. PR #12.\n[[/SUMMARY]]';
  const { text, summary } = extractSummary(input);
  assert.equal(text, 'Implemented task 4, all tests pass.');
  assert.equal(summary, 'PASS. Changed src/foo.js. PR #12.');
});

test('extractSummary: no block present returns null summary, text unchanged', () => {
  const input = 'Just a normal reply with no summary marker.';
  const { text, summary } = extractSummary(input);
  assert.equal(text, input);
  assert.equal(summary, null);
});

test('extractSummary: only the first block is treated as the marker', () => {
  const input = 'Body text.\n[[SUMMARY]]\nfirst\n[[/SUMMARY]]\nmore text\n[[SUMMARY]]\nsecond\n[[/SUMMARY]]';
  const { text, summary } = extractSummary(input);
  assert.equal(summary, 'first');
  assert.equal(text, 'Body text.\n\nmore text\n[[SUMMARY]]\nsecond\n[[/SUMMARY]]');
});

test('canChainJob: default max depth of 3', () => {
  assert.equal(canChainJob(0), true);  // dispatching depth-1 job — allowed
  assert.equal(canChainJob(1), true);  // dispatching depth-2 job — allowed
  assert.equal(canChainJob(2), true);  // dispatching depth-3 job — allowed
  assert.equal(canChainJob(3), false); // dispatching depth-4 job — refused
  assert.equal(canChainJob(4), false);
});

test('canChainJob: custom max depth', () => {
  assert.equal(canChainJob(0, 1), true);  // dispatching depth-1 job — allowed
  assert.equal(canChainJob(1, 1), false); // dispatching depth-2 job — refused
  assert.equal(canChainJob(0, 0), false); // no chaining allowed at all
});

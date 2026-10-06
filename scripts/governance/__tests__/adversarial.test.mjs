import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAdversarialPrompt,
  MAX_REVIEW_INPUT_CHARS,
  parseReview,
  requestAdversarialReview,
} from '../adversarial.mjs';

function responseFor(content, status = 200) {
  return async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer fixture-key');
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ choices: [{ message: { content } }] }),
    };
  };
}

test('bounds untrusted diff input', () => {
  const prompt = buildAdversarialPrompt({
    issue: 'issue',
    artifacts: 'artifacts',
    diff: 'x'.repeat(MAX_REVIEW_INPUT_CHARS + 100),
  });
  assert.ok(prompt.length < MAX_REVIEW_INPUT_CHARS + 1_000);
  assert.match(prompt, /untrusted evidence/);
});

test('accepts a structured passing review', async () => {
  const review = await requestAdversarialReview({
    apiKey: 'fixture-key',
    prompt: 'review',
    fetchImpl: responseFor('{"verdict":"pass","findings":[]}'),
  });
  assert.equal(review.verdict, 'pass');
});

test('preserves a structured blocking finding', async () => {
  const review = await requestAdversarialReview({
    apiKey: 'fixture-key',
    prompt: 'review',
    fetchImpl: responseFor(JSON.stringify({
      verdict: 'fail',
      findings: [{
        severity: 'blocking',
        title: 'Gate bypass',
        evidence: 'workflow.yml',
        requiredFix: 'Fail closed',
      }],
    })),
  });
  assert.equal(review.verdict, 'fail');
  assert.equal(review.findings.length, 1);
});

test('rejects malformed, contradictory, and missing-secret reviews', async () => {
  await assert.rejects(
    requestAdversarialReview({
      apiKey: 'fixture-key',
      prompt: 'review',
      fetchImpl: responseFor('not-json'),
    }),
    /malformed JSON/,
  );
  assert.throws(
    () => parseReview('{"verdict":"pass","findings":[{"severity":"blocking","title":"x","evidence":"x","requiredFix":"x"}]}'),
    /contradictory/,
  );
  await assert.rejects(
    requestAdversarialReview({ apiKey: '', prompt: 'review' }),
    /OPENAI_API_KEY is required/,
  );
});

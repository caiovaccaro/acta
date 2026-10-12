import { describe, expect, it, jest } from '@jest/globals';
import { resolveNotificationConfig, sendResendEmail } from '../../notifications/resend';
import { TEST_PIPELINE_EMAIL_FROM, TEST_PIPELINE_EMAIL_TO } from '../../notifications/templates';

describe('Resend adapter', () => {
  it('records acceptance, rejection, and timeout without exposing the destination', async () => {
    const accepted = await sendResendEmail({
      kind: 'success',
      subject: '[Acta] Pipeline completed: 1 articles, 0 verdicts updated',
      text: 'ok',
    }, {
      apiKey: 're_test',
      from: TEST_PIPELINE_EMAIL_FROM,
      to: TEST_PIPELINE_EMAIL_TO,
      fetchImpl: jest.fn(async () => ({
        ok: true,
        json: async () => ({ id: 'msg-1' }),
      })) as unknown as typeof fetch,
    });
    expect(accepted).toMatchObject({ ok: true, providerMessageId: 'msg-1' });
    expect(JSON.stringify(accepted)).not.toContain(TEST_PIPELINE_EMAIL_TO);

    const rejected = await sendResendEmail({
      kind: 'failure',
      subject: '[Acta] Pipeline failed: terminal error',
      text: 'fail',
    }, {
      apiKey: 're_test',
      from: TEST_PIPELINE_EMAIL_FROM,
      to: TEST_PIPELINE_EMAIL_TO,
      fetchImpl: jest.fn(async () => ({
        ok: false,
        status: 422,
        json: async () => ({}),
      })) as unknown as typeof fetch,
    });
    expect(rejected).toMatchObject({ ok: false, reason: 'rejected' });

    const timeout = await sendResendEmail({
      kind: 'pause',
      subject: '[Acta] Pipeline paused: DEADLINE',
      text: 'pause',
    }, {
      apiKey: 're_test',
      from: TEST_PIPELINE_EMAIL_FROM,
      to: TEST_PIPELINE_EMAIL_TO,
      fetchImpl: jest.fn(async () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      }) as unknown as typeof fetch,
    });
    expect(timeout).toMatchObject({ ok: false, reason: 'timeout' });

    const network = await sendResendEmail({
      kind: 'success',
      subject: '[Acta] Pipeline completed: 1 articles, 0 verdicts updated',
      text: 'ok',
    }, {
      apiKey: 're_test',
      from: TEST_PIPELINE_EMAIL_FROM,
      to: TEST_PIPELINE_EMAIL_TO,
      fetchImpl: jest.fn(async () => {
        throw new Error('fetch failed');
      }) as unknown as typeof fetch,
    });
    expect(network).toMatchObject({ ok: false, reason: 'network' });
    expect(JSON.stringify(network)).not.toContain(TEST_PIPELINE_EMAIL_TO);
  });

  it('treats missing or disabled mailer config as fail-open, not a budget bypass', () => {
    expect(resolveNotificationConfig({
      PIPELINE_EMAIL_DISABLED: '1',
      RESEND_API_KEY: 're_test',
    })).toMatchObject({ disabled: true, missing: false });
    expect(resolveNotificationConfig({
      RESEND_API_KEY: 're_test',
      PIPELINE_EMAIL_FROM: TEST_PIPELINE_EMAIL_FROM,
    })).toMatchObject({ disabled: false, missing: true });
    expect(resolveNotificationConfig({}).missing).toBe(true);
  });
});

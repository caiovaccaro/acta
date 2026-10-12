import type { NotificationDeliveryReason, RenderedNotification } from './types';

export interface ResendClientConfig {
  apiKey?: string | null;
  from?: string | null;
  to?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  endpoint?: string;
}

export interface ResendSendResult {
  ok: boolean;
  providerMessageId?: string;
  reason?: NotificationDeliveryReason;
}

const DEFAULT_ENDPOINT = 'https://api.resend.com/emails';

export function resolveNotificationConfig(env: NodeJS.ProcessEnv): {
  disabled: boolean;
  missing: boolean;
  apiKey?: string;
  from?: string;
  to?: string;
  publicUrl: string;
  adminUrl: string;
} {
  if (env.PIPELINE_EMAIL_DISABLED === '1') {
    return {
      disabled: true,
      missing: false,
      publicUrl: env.ACTA_PUBLIC_URL ?? 'https://acta.example.invalid',
      adminUrl: env.ACTA_ADMIN_URL ?? 'https://acta.example.invalid/admin/topics',
    };
  }
  const apiKey = env.RESEND_API_KEY;
  const from = env.PIPELINE_EMAIL_FROM;
  const to = env.PIPELINE_EMAIL_TO;
  const missing = !apiKey || !from || !to;
  return {
    disabled: false,
    missing,
    apiKey: apiKey || undefined,
    from: from || undefined,
    to: to || undefined,
    publicUrl: env.ACTA_PUBLIC_URL ?? 'https://acta.example.invalid',
    adminUrl: env.ACTA_ADMIN_URL ?? 'https://acta.example.invalid/admin/topics',
  };
}

export async function sendResendEmail(
  input: RenderedNotification,
  config: ResendClientConfig,
): Promise<ResendSendResult> {
  if (!config.apiKey || !config.from || !config.to) {
    return { ok: false, reason: 'missing_config' };
  }
  const fetchImpl = config.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 8000);
  try {
    const response = await fetchImpl(config.endpoint ?? DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!response.ok) {
      return { ok: false, reason: 'rejected' };
    }
    const payload = await response.json() as { id?: string };
    return { ok: true, providerMessageId: payload.id };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return { ok: false, reason: aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timeout);
  }
}

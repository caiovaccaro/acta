const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]+/g,
  /re_[A-Za-z0-9]+/g,
  /tvly-[A-Za-z0-9_-]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
];

const FORBIDDEN_SNIPPETS = [
  'apiKey',
  'api_key',
  'DATABASE_URL',
  'DIRECT_DATABASE_URL',
  'OPENAI_API_KEY',
  'TAVILY_API_KEY',
  'RESEND_API_KEY',
  'PIPELINE_EMAIL_TO',
  'PIPELINE_EMAIL_FROM',
  'ADMIN_PASSWORD',
  'ADMIN_SESSION_SECRET',
  'textContent',
];

export function redactNotificationText(value: string): string {
  let redacted = value;
  for (let index = 0; index < SECRET_PATTERNS.length; index += 1) {
    redacted = redacted.replace(SECRET_PATTERNS[index], '[redacted]');
  }
  let next = redacted;
  for (let index = 0; index < FORBIDDEN_SNIPPETS.length; index += 1) {
    const snippet = FORBIDDEN_SNIPPETS[index];
    const matcher = new RegExp(snippet, 'gi');
    next = next.replace(matcher, '[redacted]');
  }
  return next;
}

export function assertRedactedNotification(payload: { subject: string; text: string }): void {
  const serialized = `${payload.subject}\n${payload.text}`;
  if (serialized.includes('sk-') || serialized.includes('re_') || serialized.includes('tvly-')) {
    throw new Error('Notification must not include provider secrets');
  }
  const lowered = serialized.toLowerCase();
  if (lowered.includes('pipeline_email_to') || lowered.includes('resend_api_key')) {
    throw new Error('Notification must not include email secret names');
  }
}

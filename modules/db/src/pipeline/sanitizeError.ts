const MAX_ERROR_CODE_LENGTH = 64;
const MAX_ERROR_MESSAGE_LENGTH = 1000;

const SECRET_ASSIGNMENT =
  /\b(password|passwd|secret|token|api[_-]?key|authorization)\b\s*[:=]\s*([^\s,;]+)/gi;
const URL_CREDENTIALS = /([a-z][a-z0-9+.-]*:\/\/)[^@\s/]+@/gi;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export interface SanitizedPipelineError {
  errorCode: string | null;
  errorMessage: string | null;
}

function bounded(value: string, length: number): string {
  return value.slice(0, length);
}

export function sanitizePipelineError(
  code?: string | null,
  message?: string | null,
): SanitizedPipelineError {
  const sanitizedCode = code
    ? bounded(code.replace(/[^A-Za-z0-9_.-]/g, '_'), MAX_ERROR_CODE_LENGTH)
    : null;

  const sanitizedMessage = message
    ? bounded(
        message
          .replace(URL_CREDENTIALS, '$1[REDACTED]@')
          .replace(SECRET_ASSIGNMENT, '$1=[REDACTED]')
          .replace(CONTROL_CHARACTERS, ' ')
          .trim(),
        MAX_ERROR_MESSAGE_LENGTH,
      )
    : null;

  return {
    errorCode: sanitizedCode || null,
    errorMessage: sanitizedMessage || null,
  };
}

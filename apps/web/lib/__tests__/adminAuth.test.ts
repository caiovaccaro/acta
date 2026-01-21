import { createSessionToken, verifySessionToken } from '../../lib/adminAuth';

describe('adminAuth', () => {
  const email = 'admin@acta.app';
  const password = 'secret';
  const secret = 'test-secret';

  beforeAll(() => {
    process.env.ADMIN_EMAIL = email;
    process.env.ADMIN_PASSWORD = password;
    process.env.ADMIN_SESSION_SECRET = secret;
  });

  it('creates and verifies a session token', () => {
    const token = createSessionToken(email);
    const session = verifySessionToken(token);
    expect(session).not.toBeNull();
    expect(session?.email).toBe(email);
  });

  it('rejects tampered tokens', () => {
    const token = createSessionToken(email);
    const tampered = token.replace(/\.$/, '.x');
    const session = verifySessionToken(tampered);
    expect(session).toBeNull();
  });

  it('rejects expired tokens', () => {
    const token = createSessionToken(email);
    const originalNow = Date.now;
    const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(originalNow() + eightDaysMs);
    const session = verifySessionToken(token);
    expect(session).toBeNull();
    (Date.now as jest.Mock).mockRestore();
  });
});




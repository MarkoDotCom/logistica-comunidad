import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('hashes with a random salt and verifies only the right password', () => {
    const a = hashPassword('Comunidad2026!');
    const b = hashPassword('Comunidad2026!');
    expect(a).not.toBe(b);
    expect(a.startsWith('scrypt$16384$8$1$')).toBe(true);
    expect(verifyPassword('Comunidad2026!', a)).toBe(true);
    expect(verifyPassword('comunidad2026!', a)).toBe(false);
    expect(verifyPassword('x', 'basura')).toBe(false);
  });
});

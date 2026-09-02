import {
  renderEmailVerification,
  renderPasswordReset,
  renderWelcome,
} from './render';

describe('email templates', () => {
  it('renders the password-reset email with the url and expiry', () => {
    const mail = renderPasswordReset({
      url: 'https://app.example/reset?token=abc',
      expiresInMinutes: 60,
    });

    expect(mail.subject).toMatch(/reset/i);
    expect(mail.text).toContain('https://app.example/reset?token=abc');
    expect(mail.text).toContain('60 minutes');
    expect(mail.html).toContain('href="https://app.example/reset?token=abc"');
  });

  it('renders the verification email with the url', () => {
    const mail = renderEmailVerification({
      url: 'https://app.example/verify?token=xyz',
    });

    expect(mail.subject).toMatch(/verify/i);
    expect(mail.text).toContain('https://app.example/verify?token=xyz');
    expect(mail.html).toContain('href="https://app.example/verify?token=xyz"');
  });

  it('renders the welcome email and falls back to a generic greeting', () => {
    expect(renderWelcome({ firstName: 'Ada' }).text).toContain('Hi Ada');
    expect(renderWelcome({ firstName: '   ' }).text).toContain('Hi there');
  });

  it('escapes HTML-significant characters in interpolated values', () => {
    const mail = renderWelcome({ firstName: '<script>' });

    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});

/**
 * English base translations (V2.3 step 47). Bundled, not lazy-loaded — the
 * starter has few strings and `frontend-i18n` uses an inline Transloco
 * loader. Keys are namespaced by brick. Edit / extend for your project.
 */
export const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    email: 'Email',
    password: 'Password',
  },
  lang: {
    label: 'Language',
    en: 'English',
    fr: 'Français',
  },
  auth: {
    login: {
      title: 'Sign in',
      submit: 'Sign in',
      forgot: 'Forgot your password?',
      createAccount: 'Create an account',
      with: 'Sign in with {{ provider }}',
      invalid: 'Invalid email or password',
    },
    register: {
      title: 'Create your account',
      firstName: 'First name',
      lastName: 'Last name',
      passwordHint: 'At least {{ count }} characters',
      submit: 'Create account',
      haveAccount: 'Already have an account? Sign in',
      failed: 'Could not create the account',
    },
    forgot: {
      title: 'Reset your password',
      submit: 'Send reset link',
      done: 'If an account exists for that address, a reset link is on its way. Check your inbox.',
      backToLogin: 'Back to sign in',
    },
    reset: {
      title: 'Choose a new password',
      newPassword: 'New password',
      passwordHint: 'At least {{ count }} characters',
      missingToken: 'This reset link is missing its token. Request a new one.',
      requestNew: 'Request a new link',
      submit: 'Reset password',
      failed: 'Could not reset your password. The link may have expired.',
    },
    verify: {
      checking: 'Verifying your email address…',
      okTitle: 'Email verified',
      okBody: 'Thanks — your email address is confirmed.',
      goToApp: 'Continue',
      failedTitle: 'Verification failed',
      failedBody: 'This link is invalid or has expired. Request a new one.',
      backToApp: 'Back to the app',
      banner: 'Please verify your email address to secure your account.',
      resend: 'Resend email',
      resent: 'Verification email sent.',
    },
    twoFactor: {
      title: 'Two-factor authentication',
      hint: 'Enter the 6-digit code from your authenticator app, or one of your backup codes.',
      code: 'Authentication code',
      verify: 'Verify',
      invalid: 'That code is not valid',
    },
    callback: {
      signingIn: 'Signing you in…',
    },
  },
  dashboard: {
    signOut: 'Sign out',
    profile: 'Profile',
    appearance: 'Appearance',
    manageCookies: 'Manage cookies',
    signedIn: 'Signed in',
    toggleNav: 'Toggle navigation',
    nav: {
      home: 'Home',
      admin: 'Admin',
      roles: 'Roles',
      audit: 'Audit',
      profile: 'Profile',
    },
  },
};

export type TranslationShape = typeof en;

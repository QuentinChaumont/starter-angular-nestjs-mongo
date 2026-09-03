import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import type {
  ConnectedAccounts,
  OidcProviderInfo,
  UserProfile,
} from '@org/shared-contracts';
import { AuthService, ResetService } from '@org/frontend-auth';
import { DialogService, NotificationService } from '@org/frontend-feedback';
import { ProfilePage } from './profile-page';
import { ProfileService } from './profile.service';

const profile: UserProfile = {
  id: 'u1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  roles: [],
  locale: null,
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  twoFactorEnabled: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 5));
    TestBed.tick();
    await fixture.whenStable();
  }
}

describe('ProfilePage — connected accounts', () => {
  const getProfile = jest.fn();
  const getConnectedAccounts = jest.fn();
  const startIdentityLink = jest.fn();
  const unlinkIdentity = jest.fn();
  const oidcProviders = jest.fn();
  const setupTwoFactor = jest.fn();
  const confirmTwoFactor = jest.fn();
  const disableTwoFactor = jest.fn();
  const notify = { success: jest.fn(), error: jest.fn() };

  function build(
    queryParams: Record<string, string> = {},
    profileOverride: Partial<UserProfile> = {},
  ): ComponentFixture<ProfilePage> {
    getProfile.mockReturnValue(of({ ...profile, ...profileOverride }));
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideRouter([]),
        {
          provide: ProfileService,
          useValue: {
            getProfile,
            updateProfile: jest.fn(),
            changePassword: jest.fn(),
            deleteAccount: jest.fn(),
            getConnectedAccounts,
            startIdentityLink,
            unlinkIdentity,
            setupTwoFactor,
            confirmTwoFactor,
            disableTwoFactor,
            listSessions: () => of([]),
            revokeSession: jest.fn(),
            revokeOtherSessions: jest.fn(),
          },
        },
        { provide: AuthService, useValue: { oidcProviders, loadMe: () => of(null) } },
        { provide: ResetService, useValue: { resendVerification: () => of(null) } },
        { provide: DialogService, useValue: { confirm: () => of(true) } },
        { provide: NotificationService, useValue: notify },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    getProfile.mockReset();
    getConnectedAccounts.mockReset();
    startIdentityLink.mockReset();
    unlinkIdentity.mockReset();
    oidcProviders.mockReset();
    setupTwoFactor.mockReset();
    confirmTwoFactor.mockReset();
    disableTwoFactor.mockReset();
    notify.success.mockReset();
    notify.error.mockReset();
  });

  const idle = () => {
    getConnectedAccounts.mockReturnValue(
      of<ConnectedAccounts>({ hasPassword: true, identities: [] }),
    );
    oidcProviders.mockReturnValue(of([]));
  };

  const clickButton = (
    fixture: ComponentFixture<ProfilePage>,
    label: string,
  ): void => {
    const btn = [
      ...fixture.nativeElement.querySelectorAll('button'),
    ].find((b: HTMLButtonElement) => b.textContent?.includes(label)) as
      | HTMLButtonElement
      | undefined;
    if (!btn) throw new Error(`no button matching "${label}"`);
    btn.click();
  };

  it('renders the password status, a linked provider and a connectable one', async () => {
    getConnectedAccounts.mockReturnValue(
      of<ConnectedAccounts>({
        hasPassword: true,
        identities: [
          {
            provider: 'google',
            label: 'Google',
            email: 'ada@gmail.com',
            linkedAt: '2026-02-01T00:00:00.000Z',
          },
        ],
      }),
    );
    oidcProviders.mockReturnValue(
      of<OidcProviderInfo[]>([
        { id: 'google', label: 'Google', loginUrl: '/auth/oidc/google/login' },
        { id: 'keycloak', label: 'Keycloak', loginUrl: '/auth/oidc/keycloak/login' },
      ]),
    );

    const fixture = build();
    await settle(fixture);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Connected accounts');
    expect(text).toContain('ada@gmail.com');
    expect(text).toContain('Disconnect');
    // keycloak is configured but not linked → a Connect button
    expect(text).toContain('Connect');
  });

  it('disconnects a provider and reloads the list', async () => {
    getConnectedAccounts
      .mockReturnValueOnce(
        of<ConnectedAccounts>({
          hasPassword: true,
          identities: [
            {
              provider: 'google',
              label: 'Google',
              email: null,
              linkedAt: '2026-02-01T00:00:00.000Z',
            },
          ],
        }),
      )
      .mockReturnValueOnce(of<ConnectedAccounts>({ hasPassword: true, identities: [] }));
    oidcProviders.mockReturnValue(of([]));
    unlinkIdentity.mockReturnValue(of(undefined));

    const fixture = build();
    await settle(fixture);

    const disconnect = [
      ...fixture.nativeElement.querySelectorAll('button'),
    ].find((b: HTMLButtonElement) =>
      b.textContent?.includes('Disconnect'),
    ) as HTMLButtonElement;
    disconnect.click();
    await settle(fixture);

    expect(unlinkIdentity).toHaveBeenCalledWith('google');
    expect(notify.success).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Disconnect');
  });

  it('starts a link flow when a Connect button is clicked', async () => {
    getConnectedAccounts.mockReturnValue(
      of<ConnectedAccounts>({ hasPassword: true, identities: [] }),
    );
    oidcProviders.mockReturnValue(
      of<OidcProviderInfo[]>([
        { id: 'google', label: 'Google', loginUrl: '/auth/oidc/google/login' },
      ]),
    );
    startIdentityLink.mockReturnValue(
      of({ authorizationUrl: 'https://accounts.google.com/authorize?x=1' }),
    );

    const fixture = build();
    await settle(fixture);

    const connect = [
      ...fixture.nativeElement.querySelectorAll('button'),
    ].find((b: HTMLButtonElement) =>
      b.textContent?.includes('Connect'),
    ) as HTMLButtonElement;
    connect.click();
    await settle(fixture);

    expect(startIdentityLink).toHaveBeenCalledWith('google');
  });

  it('surfaces a ?linkError query param as an error toast', async () => {
    getConnectedAccounts.mockReturnValue(
      of<ConnectedAccounts>({ hasPassword: true, identities: [] }),
    );
    oidcProviders.mockReturnValue(of([]));

    const fixture = build({ linkError: 'IDENTITY_ALREADY_LINKED' });
    await settle(fixture);

    expect(notify.error).toHaveBeenCalledWith(
      expect.stringContaining('already linked'),
    );
  });

  it('offers a "Set a password" link when the account has none', async () => {
    getConnectedAccounts.mockReturnValue(
      of<ConnectedAccounts>({ hasPassword: false, identities: [] }),
    );
    oidcProviders.mockReturnValue(of([]));

    const fixture = build();
    await settle(fixture);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Not set');
    expect(text).toContain('Set a password');
  });

  describe('two-factor authentication', () => {
    it('enrolls: Enable → QR + confirm → backup codes shown once', async () => {
      idle();
      setupTwoFactor.mockReturnValue(
        of({
          otpauthUri: 'otpauth://totp/App:ada',
          qrDataUri: 'data:image/png;base64,AAAA',
          secret: 'JBSWY3DPEHPK3PXP',
        }),
      );
      confirmTwoFactor.mockReturnValue(
        of({ backupCodes: ['aaaaa-11111', 'bbbbb-22222'] }),
      );

      const fixture = build();
      await settle(fixture);

      clickButton(fixture, 'Enable two-factor');
      await settle(fixture);
      expect(setupTwoFactor).toHaveBeenCalled();
      expect(
        fixture.nativeElement.querySelector('img.tfa__qr')?.getAttribute('src'),
      ).toBe('data:image/png;base64,AAAA');
      expect(fixture.nativeElement.textContent).toContain('JBSWY3DPEHPK3PXP');

      const code = fixture.nativeElement.querySelector(
        'input[formcontrolname="code"]',
      ) as HTMLInputElement;
      code.value = '123456';
      code.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      clickButton(fixture, 'Confirm');
      await settle(fixture);

      expect(confirmTwoFactor).toHaveBeenCalledWith('123456');
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('aaaaa-11111');
      expect(text).toContain('bbbbb-22222');
      expect(text).toContain("won't be shown again");
    });

    it('shows a Disable form when 2FA is already on', async () => {
      idle();
      disableTwoFactor.mockReturnValue(of(undefined));

      const fixture = build({}, { twoFactorEnabled: true });
      await settle(fixture);

      expect(fixture.nativeElement.textContent).toContain('On');
      const tfaPanel = [
        ...fixture.nativeElement.querySelectorAll('section.panel'),
      ].find((s: HTMLElement) =>
        s.textContent?.includes('Two-factor authentication'),
      ) as HTMLElement;
      const pw = tfaPanel.querySelector(
        'input[formcontrolname="password"]',
      ) as HTMLInputElement;
      pw.value = 'secret';
      pw.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      clickButton(fixture, 'Disable two-factor');
      await settle(fixture);

      expect(disableTwoFactor).toHaveBeenCalledWith('secret');
      expect(notify.success).toHaveBeenCalledWith(
        'Two-factor authentication is off.',
      );
    });
  });

  describe('devices', () => {
    const listSessions = jest.fn();
    const revokeSession = jest.fn();
    const revokeOtherSessions = jest.fn();

    function buildDevices(): ComponentFixture<ProfilePage> {
      idle();
      getProfile.mockReturnValue(of(profile));
      TestBed.configureTestingModule({
        imports: [ProfilePage],
        providers: [
          provideRouter([]),
          {
            provide: ProfileService,
            useValue: {
              getProfile,
              updateProfile: jest.fn(),
              changePassword: jest.fn(),
              deleteAccount: jest.fn(),
              getConnectedAccounts,
              startIdentityLink,
              unlinkIdentity,
              setupTwoFactor,
              confirmTwoFactor,
              disableTwoFactor,
              listSessions,
              revokeSession,
              revokeOtherSessions,
            },
          },
          { provide: AuthService, useValue: { oidcProviders, loadMe: () => of(null) } },
          { provide: ResetService, useValue: { resendVerification: () => of(null) } },
          { provide: DialogService, useValue: { confirm: () => of(true) } },
          { provide: NotificationService, useValue: notify },
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
          },
        ],
      });
      const fixture = TestBed.createComponent(ProfilePage);
      fixture.detectChanges();
      return fixture;
    }

    beforeEach(() => {
      listSessions.mockReset();
      revokeSession.mockReset();
      revokeOtherSessions.mockReset();
    });

    it('lists sessions and signs out a non-current one', async () => {
      listSessions
        .mockReturnValueOnce(
          of([
            {
              id: 'fam-a',
              ip: '10.0.0.1',
              userAgent: 'Chrome',
              createdAt: '2026-02-01T00:00:00.000Z',
              lastUsedAt: '2026-02-02T00:00:00.000Z',
              current: true,
            },
            {
              id: 'fam-b',
              ip: '10.0.0.2',
              userAgent: 'Firefox',
              createdAt: '2026-02-01T00:00:00.000Z',
              lastUsedAt: '2026-02-01T12:00:00.000Z',
              current: false,
            },
          ]),
        )
        .mockReturnValueOnce(of([]));
      revokeSession.mockReturnValue(of(undefined));

      const fixture = buildDevices();
      await settle(fixture);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('This device');
      expect(text).toContain('Firefox');

      const btn = [
        ...fixture.nativeElement.querySelectorAll('button'),
      ].find((b: HTMLButtonElement) => b.textContent?.trim() === 'Sign out') as
        | HTMLButtonElement
        | undefined;
      btn?.click();
      await settle(fixture);

      expect(revokeSession).toHaveBeenCalledWith('fam-b');
    });

    it('signs out everywhere else', async () => {
      listSessions.mockReturnValue(
        of([
          { id: 'a', ip: null, userAgent: null, createdAt: '', lastUsedAt: '', current: true },
          { id: 'b', ip: null, userAgent: null, createdAt: '', lastUsedAt: '', current: false },
        ]),
      );
      revokeOtherSessions.mockReturnValue(of(undefined));

      const fixture = buildDevices();
      await settle(fixture);

      const btn = [
        ...fixture.nativeElement.querySelectorAll('button'),
      ].find((b: HTMLButtonElement) =>
        b.textContent?.includes('Sign out everywhere else'),
      ) as HTMLButtonElement | undefined;
      btn?.click();
      await settle(fixture);

      expect(revokeOtherSessions).toHaveBeenCalled();
    });
  });
});

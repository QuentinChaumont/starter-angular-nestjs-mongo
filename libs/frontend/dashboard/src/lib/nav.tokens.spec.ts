import { NavItem, filterNavByRole } from './nav.tokens';

const NAV: NavItem[] = [
  { label: 'Home', icon: 'home', route: '' },
  {
    label: 'Admin',
    icon: 'shield',
    roles: ['admin'],
    children: [
      { label: 'Users', icon: 'group', route: 'admin' },
      { label: 'Danger zone', icon: 'warning', route: 'admin/danger', roles: ['owner'] },
    ],
  },
  { label: 'Owner only', icon: 'lock', route: 'owner', roles: ['owner'] },
];

describe('filterNavByRole', () => {
  it('drops a role-gated leaf a user lacks the role for', () => {
    expect(filterNavByRole(NAV, [])).toEqual([{ label: 'Home', icon: 'home', route: '' }]);
  });

  it('keeps a group and its visible children for a user holding its role', () => {
    const result = filterNavByRole(NAV, ['admin']);
    const admin = result.find((item) => item.label === 'Admin');
    expect(admin?.children).toEqual([{ label: 'Users', icon: 'group', route: 'admin' }]);
  });

  it('further filters children by their own roles', () => {
    const result = filterNavByRole(NAV, ['admin', 'owner']);
    const admin = result.find((item) => item.label === 'Admin');
    expect(admin?.children?.map((c) => c.label)).toEqual(['Users', 'Danger zone']);
  });

  it('drops a group left with no visible children', () => {
    const emptied: NavItem[] = [
      {
        label: 'Empty',
        icon: 'folder',
        children: [{ label: 'Hidden', icon: 'lock', route: 'x', roles: ['owner'] }],
      },
    ];
    expect(filterNavByRole(emptied, [])).toEqual([]);
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(NAV);
    filterNavByRole(NAV, ['admin']);
    expect(JSON.stringify(NAV)).toBe(before);
  });
});

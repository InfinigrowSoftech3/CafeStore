export const ROLES = ['owner', 'manager', 'cashier', 'kitchen'];

export const ROLE_LABELS = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
  kitchen: 'Kitchen / Barista',
};

export const effectiveRole = (role) => ({ admin: 'owner', staff: 'manager' }[role] || role);

export const getRoleLabel = (role) => ROLE_LABELS[effectiveRole(role)] || role || 'User';

export const canManageTeam = (role) => effectiveRole(role) === 'owner';

export const canManageMenu = (role) => ['owner', 'manager'].includes(effectiveRole(role));

export const canViewOrders = (role) => ['owner', 'manager', 'cashier', 'kitchen'].includes(effectiveRole(role));

export const canAccessPos = (role) => ['owner', 'manager', 'cashier'].includes(effectiveRole(role));

export const canAccessKds = (role) => ['owner', 'manager', 'kitchen'].includes(effectiveRole(role));

export const canAccessAdmin = (role) => ['owner', 'manager'].includes(effectiveRole(role));

export const canAccessApp = (app, role) => {
  const normApp = String(app || '').toLowerCase();
  if (normApp === 'customer') return true;
  if (normApp === 'pos') return canAccessPos(role);
  if (normApp === 'kds') return canAccessKds(role);
  if (normApp === 'admin') return canAccessAdmin(role);
  return false;
};


export const effectiveRole = (role) => ({ admin: 'owner', staff: 'manager' }[role] || role);

export const canManageTeam = (role) => effectiveRole(role) === 'owner';

export const canManageMenu = (role) => ['owner', 'manager'].includes(effectiveRole(role));

export const canViewOrders = (role) => ['owner', 'manager', 'cashier', 'kitchen'].includes(effectiveRole(role));

export const canAccessPos = (role) => ['owner', 'manager', 'cashier'].includes(effectiveRole(role));

export const canAccessKds = (role) => ['owner', 'manager', 'kitchen'].includes(effectiveRole(role));

export const canAccessAdmin = (role) => ['owner', 'manager'].includes(effectiveRole(role));

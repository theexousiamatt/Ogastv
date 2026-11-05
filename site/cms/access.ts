export const staffRoles = [
  'administrator', 'editor_in_chief', 'editor', 'journalist', 'moderator', 'advertising_manager',
] as const;

export type StaffRole = (typeof staffRoles)[number];
export type Principal = { id: string | number; collection?: string; role?: string };

export function getStaff(user: unknown): Principal | null {
  if (!user || typeof user !== 'object') return null;
  const actor = user as Principal;
  if (actor.collection !== 'staff-users' || !staffRoles.includes(actor.role as StaffRole)) return null;
  return actor;
}

export const hasRole = (user: unknown, ...roles: StaffRole[]): boolean => {
  const actor = getStaff(user);
  return Boolean(actor && roles.includes(actor.role as StaffRole));
};
export const isStaff = (user: unknown): boolean => Boolean(getStaff(user));
export const editorial = (user: unknown): boolean =>
  hasRole(user, 'administrator', 'editor_in_chief', 'editor', 'journalist');
export const canPublish = (user: unknown): boolean =>
  hasRole(user, 'administrator', 'editor_in_chief');
export const canReview = (user: unknown): boolean =>
  hasRole(user, 'administrator', 'editor_in_chief', 'editor');

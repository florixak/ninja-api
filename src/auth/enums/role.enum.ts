export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export function parseRole(value: string): Role | null {
  return Object.values(Role).includes(value as Role) ? (value as Role) : null;
}

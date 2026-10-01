import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLE_GROUPS_KEY = 'roleGroups';

// Grupos de rol usados para autorizar: el nombre del rol en la base de datos se
// normaliza al grupo (los roles se administran desde el módulo de usuarios).
export type RoleGroup = 'admin' | 'staff' | 'kitchen';

export function roleGroupOf(roleName?: string | null): RoleGroup {
  const normalized = (roleName ?? '').trim().toLowerCase();
  if (normalized === 'admin' || normalized.includes('administrador')) return 'admin';
  if (normalized.includes('cocina')) return 'kitchen';
  return 'staff';
}

// Marca un endpoint como accesible sin token (solo el inicio de sesión).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Restringe un endpoint o controlador a los grupos de rol indicados.
export const AllowRoles = (...groups: RoleGroup[]) => SetMetadata(ROLE_GROUPS_KEY, groups);

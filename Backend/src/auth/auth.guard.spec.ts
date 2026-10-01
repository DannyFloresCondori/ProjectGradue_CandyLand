import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { IS_PUBLIC_KEY, ROLE_GROUPS_KEY, roleGroupOf } from './auth.decorators';

describe('AuthGuard', () => {
  const jwtService = new JwtService({ secret: 'clave-de-prueba' });
  let reflector: Reflector;
  let guard: AuthGuard;

  const contextWith = (authorization?: string): { ctx: ExecutionContext; request: any } => {
    const request: any = { headers: authorization ? { authorization } : {} };
    const ctx = {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { ctx, request };
  };

  const metadata = (values: Record<string, unknown>) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => values[key]);

  beforeEach(() => {
    reflector = new Reflector();
    guard = new AuthGuard(jwtService, reflector);
  });

  it('rechaza una petición sin token', async () => {
    metadata({});
    await expect(guard.canActivate(contextWith().ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un token no firmado por el servidor', async () => {
    metadata({});
    const forged = Buffer.from('user-1:123').toString('base64');
    await expect(guard.canActivate(contextWith(`Bearer ${forged}`).ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('permite el acceso con un token válido y adjunta el usuario a la petición', async () => {
    metadata({});
    const token = await jwtService.signAsync({ sub: 'user-1', username: 'cajero', role: 'Cajero' });
    const { ctx, request } = contextWith(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toMatchObject({ sub: 'user-1', role: 'Cajero' });
  });

  it('permite el inicio de sesión sin token (endpoint público)', async () => {
    metadata({ [IS_PUBLIC_KEY]: true });
    await expect(guard.canActivate(contextWith().ctx)).resolves.toBe(true);
  });

  it('bloquea con 403 a un rol sin permiso para el endpoint', async () => {
    metadata({ [ROLE_GROUPS_KEY]: ['admin'] });
    const token = await jwtService.signAsync({ sub: 'user-2', username: 'cajero', role: 'Cajero' });
    await expect(guard.canActivate(contextWith(`Bearer ${token}`).ctx)).rejects.toThrow(ForbiddenException);
  });

  it('permite al administrador un endpoint restringido a administradores', async () => {
    metadata({ [ROLE_GROUPS_KEY]: ['admin'] });
    const token = await jwtService.signAsync({ sub: 'user-3', username: 'admin', role: 'Administrador' });
    await expect(guard.canActivate(contextWith(`Bearer ${token}`).ctx)).resolves.toBe(true);
  });

  it('clasifica los nombres de rol en grupos', () => {
    expect(roleGroupOf('Administrador')).toBe('admin');
    expect(roleGroupOf('cocina')).toBe('kitchen');
    expect(roleGroupOf('Cajero')).toBe('staff');
  });
});

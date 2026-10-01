import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, ROLE_GROUPS_KEY, RoleGroup, roleGroupOf } from './auth.decorators';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

// Guard global: exige un token JWT válido en cada petición HTTP (salvo las marcadas
// con @Public) y, si el endpoint declara @AllowRoles, verifica el grupo del rol.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest();
    const [scheme, token] = (request.headers?.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Sesión no válida. Inicie sesión nuevamente.');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Sesión expirada o no válida. Inicie sesión nuevamente.');
    }
    request.user = payload;

    const allowed = this.reflector.getAllAndOverride<RoleGroup[]>(ROLE_GROUPS_KEY, targets);
    if (allowed?.length && !allowed.includes(roleGroupOf(payload.role))) {
      throw new ForbiddenException('No tiene permisos para realizar esta acción.');
    }
    return true;
  }
}

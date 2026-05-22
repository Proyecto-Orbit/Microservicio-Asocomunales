import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/allow-roles.decorator';
import { KeycloakKeyService } from '../keycloak-key.service';

interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
}

@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly keycloakKeyService: KeycloakKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const cookieName = process.env.COOKIE_NAME ?? 'token';
    const cookieToken: string | undefined = (request.cookies as Record<string, string>)?.[cookieName];
    const token = this.extractToken(authHeader) ?? cookieToken?.trim();

    if (!token) {
      throw new UnauthorizedException('Token de autenticación no proporcionado');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: await this.keycloakKeyService.getPublicKey(),
        algorithms: ['RS256'],
      });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const allowedRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    const requiredRoles = allowedRoles && allowedRoles.length > 0 ? allowedRoles : ['admin'];
    const role = this.mapRole(payload.realm_access?.roles ?? []);

    // superadmin tiene acceso a todo; otros roles se verifican contra la lista requerida
    if (role !== 'superadmin' && !requiredRoles.includes(role)) {
      throw new ForbiddenException(
        `Acceso restringido. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`,
      );
    }

    (request as Request & { user: { sub: string; email?: string; nombre: string; rol: string } }).user = {
      sub: payload.sub,
      email: payload.email,
      nombre: payload.name ?? payload.preferred_username ?? payload.email ?? '',
      rol: role,
    };

    return true;
  }

  private extractToken(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    if (type === 'Bearer' && token) {
      return token;
    }

    return null;
  }

  private mapRole(roles: string[]): string {
    if (roles.includes('superadmin')) return 'superadmin';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('operador')) return 'operador';
    return 'usuario';
  }
}

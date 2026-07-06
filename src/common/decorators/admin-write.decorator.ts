import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ExcludeInProduction } from './exclude-prod.decorator';

export const AdminWrite = () => {
  const decorators: MethodDecorator[] = [
    ApiBearerAuth(),
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(Role.ADMIN),
    SkipThrottle({ read: true, auth: true }),
    ExcludeInProduction(),
  ];

  return applyDecorators(...decorators);
};

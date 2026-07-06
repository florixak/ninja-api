import { applyDecorators } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

export const ExcludeInProduction = () => {
  const decorators: MethodDecorator[] = [];

  if (process.env.NODE_ENV === 'production') {
    decorators.push(ApiExcludeEndpoint());
  }

  return applyDecorators(...decorators);
};

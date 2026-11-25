import { Controller, Get } from '@nestjs/common';
import type { CurrentUser as CurrentUserType } from '@lms/shared';
import { CurrentUser } from './current-user.decorator.js';

@Controller('me')
export class MeController {
  @Get()
  me(@CurrentUser() user: CurrentUserType): CurrentUserType {
    return user;
  }
}

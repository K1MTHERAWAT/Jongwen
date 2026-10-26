import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminController } from './admin/admin.controller';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { DbService } from './db/db.service';
import { RequestsController } from './requests/requests.controller';
import { ResourcesController } from './resources/resources.controller';

@Module({
  controllers: [AuthController, ResourcesController, RequestsController, AdminController],
  providers: [
    DbService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}

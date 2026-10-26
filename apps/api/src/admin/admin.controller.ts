import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  Account,
  DEFAULT_PERMISSIONS,
  PERMISSION_KEYS,
  PermissionKey,
  ROLE_LABEL,
  Role,
} from '@jongwen/shared';
import { CurrentUser, Permissions } from '../auth/auth.guard';
import { DbService } from '../db/db.service';

const VALID_ROLES: Role[] = ['USER', 'STAFF', 'APPROVER_L2', 'APPROVER_L1', 'ADMIN'];

@Controller()
export class AdminController {
  constructor(private readonly db: DbService) {}

  @Permissions('manageUsers', 'walkIn', 'review')
  @Get('users')
  listUsers(@Query('q') q?: string, @Query('role') role?: Role) {
    return this.db.accounts
      .filter((a) => {
        if (role && a.role !== role) return false;
        if (q) {
          const s = q.toLowerCase();
          return a.name.toLowerCase().includes(s) || a.phone.includes(s) || a.username.toLowerCase().includes(s);
        }
        return true;
      })
      .map((a) => this.db.toPublic(a));
  }

  @Permissions('manageUsers')
  @Patch('users/:id/permissions')
  async updatePermissions(
    @CurrentUser() actor: Account,
    @Param('id') id: string,
    @Body() body: { role?: Role; permissions?: Partial<Record<PermissionKey, boolean>>; active?: boolean },
  ) {
    const target = this.db.accounts.find((a) => a.id === id);
    if (!target) throw new NotFoundException('ไม่พบผู้ใช้');
    if (body.role !== undefined && !VALID_ROLES.includes(body.role)) {
      throw new BadRequestException('บทบาทไม่ถูกต้อง');
    }
    if (target.id === actor.id) {
      if (body.role && body.role !== 'ADMIN') {
        throw new ForbiddenException('ไม่สามารถลดระดับบทบาทผู้ดูแลระบบของตนเองได้');
      }
      if (body.permissions && body.permissions.manageUsers === false) {
        throw new ForbiddenException('ไม่สามารถเพิกถอนสิทธิ์จัดการผู้ใช้งานของตนเองได้');
      }
      if (body.active === false) {
        throw new ForbiddenException('ไม่สามารถปิดการใช้งานบัญชีของตนเองได้');
      }
    }
    if (typeof body.active === 'boolean' && body.active !== (target.active ?? true)) {
      target.active = body.active;
      this.db.log('user', `${body.active ? 'เปิด' : 'ระงับ'}การใช้งานบัญชี`, target.name);
    }
    if (body.role && body.role !== target.role) {
      target.role = body.role;
      target.permissions = { ...DEFAULT_PERMISSIONS[body.role] };
      this.db.log('role', `เปลี่ยนสิทธิ์เป็น${ROLE_LABEL[body.role]}`, target.name);
    }
    if (body.permissions && typeof body.permissions === 'object') {
      const nextPerms: Record<PermissionKey, boolean> = { ...target.permissions };
      for (const key of PERMISSION_KEYS) {
        if (typeof body.permissions[key] === 'boolean') {
          nextPerms[key] = body.permissions[key]!;
        }
      }
      target.permissions = nextPerms;
      this.db.log('role', `อัปเดตสิทธิ์การใช้งานรายย่อย`, target.name);
    }
    await this.db.persistAccount(target);
    return this.db.toPublic(target);
  }

  @Permissions('manageUsers')
  @Get('admin/overview')
  overview() {
    const pendingCount = this.db.requests.filter((r) =>
      ['pending_staff', 'pending_l2', 'pending_l1', 'repair_submitted', 'repair_in_progress'].includes(r.status),
    ).length;
    const dueReturnCount = this.db.requests.filter(
      (r) => r.status === 'borrowing' || r.status === 'return_inspect',
    ).length;
    return {
      usersCount: 242 + this.db.accounts.length,
      resourcesCount: this.db.venues.length + this.db.equipment.length,
      monthRequestsCount: 118 + this.db.requests.length,
      todayRequestsCount: this.db.requests.length,
      pendingCount,
      dueReturnCount,
      activities: this.db.activities.slice(0, 8),
    };
  }

  @Get('notifications')
  notifications(@CurrentUser() user: Account) {
    return this.db.notifications.filter((n) => n.userId === user.id);
  }

  @Post('notifications/read-all')
  readAll(@CurrentUser() user: Account) {
    this.db.markAllNotificationsRead(user.id);
    return { ok: true };
  }

  @Permissions('manageUsers')
  @Post('dev/reset')
  async reset() {
    await this.db.reset();
    return { ok: true };
  }
}

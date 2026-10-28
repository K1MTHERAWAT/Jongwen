import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DEFAULT_PERMISSIONS, Account, DemoAccountSummary } from '@jongwen/shared';
import { DbService } from '../db/db.service';
import {
  CurrentUser,
  Public,
  assertNotLocked,
  clearFailures,
  recordFailure,
  requireDrawnSignature,
} from './auth.guard';
import { hashSecret, verifySecret } from './secret';

@Controller('auth')
export class AuthController {
  constructor(private readonly db: DbService) {}

  @Public()
  @Get('demo-accounts')
  async demoAccounts(): Promise<DemoAccountSummary[]> {
    if (process.env.DEMO_MODE !== 'true') {
      throw new NotFoundException('Endpoint not available');
    }
    await this.db.checkPendingDemoReset();
    return this.db.accounts
      .filter((a) => a.isDemo && a.active !== false)
      .map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        position: a.position,
        department: a.department,
        initial: a.initial,
        nickname: a.nickname,
      }));
  }

  @Throttle({ auth: { limit: 15, ttl: 60000 } })
  @Public()
  @Post('demo-login')
  async demoLogin(@Body() body: { accountId?: string }) {
    if (process.env.DEMO_MODE !== 'true') {
      throw new NotFoundException('Endpoint not available');
    }
    await this.db.checkPendingDemoReset();
    const accountId = String(body.accountId ?? '').trim();
    if (!accountId) throw new BadRequestException('กรุณาระบุ accountId');

    const user = this.db.accounts.find((a) => a.id === accountId && a.isDemo);
    if (!user) {
      throw new UnauthorizedException('ไม่พบบัญชีทดสอบนี้ในระบบ');
    }
    if (user.active === false) {
      throw new UnauthorizedException('บัญชีนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ');
    }
    const token = await this.db.createSession(user.id);
    return { token, account: this.db.toPublic(user) };
  }

  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Public()
  @Post('login')
  async login(@Body() body: { username?: string; password?: string }) {
    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!username || !password) throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

    const lockKey = `login:${username}`;
    assertNotLocked(lockKey);

    const digits = username.replace(/\D/g, '');
    const user = this.db.accounts.find(
      (a) => a.username.toLowerCase() === username || (digits.length >= 9 && a.phone.replace(/\D/g, '') === digits),
    );
    if (!user || !(await verifySecret(user.password, password))) {
      recordFailure(lockKey);
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    if (user.active === false) {
      throw new UnauthorizedException('บัญชีนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ');
    }
    clearFailures(lockKey);
    const token = await this.db.createSession(user.id);
    return { token, account: this.db.toPublic(user) };
  }

  @Post('logout')
  async logout(@Req() req: { token?: string }) {
    if (req.token) await this.db.revokeSession(req.token);
    return { ok: true };
  }

  @Throttle({ auth: { limit: 3, ttl: 60000 } })
  @Public()
  @Post('request-otp')
  async requestOtp(@Body() body: { phone?: string }) {
    const isRegistrationOpen = process.env.DEMO_MODE === 'true' || process.env.REGISTRATION_OPEN === 'true';
    if (!isRegistrationOpen) {
      throw new ForbiddenException('ปิดรับการลงทะเบียนด้วยตนเองชั่วคราว');
    }
    const phone = String(body.phone ?? '').trim();
    const digits = phone.replace(/\D/g, '');
    if (!/^0\d{8,9}$/.test(digits)) {
      throw new BadRequestException('เบอร์โทรศัพท์ไม่ถูกต้อง');
    }

    if (process.env.DEMO_MODE === 'true') {
      return { ok: true, message: 'โหมดเดโม: ใช้รหัส OTP 000000' };
    }

    // สร้างรหัส OTP สุ่ม 6 หลัก บันทึกลงตาราง otp_codes (หมดอายุใน 5 นาที จำกัด 5 ครั้ง)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await hashSecret(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.db.prisma.otpCode.create({
      data: {
        phone: digits,
        codeHash,
        attempts: 0,
        expiresAt,
      },
    });

    // ในการใช้งานจริงจะส่งผ่าน SMS Gateway หรือ LINE OA
    return { ok: true, message: 'ส่งรหัส OTP เรียบร้อยแล้ว (หมดอายุใน 5 นาที)' };
  }

  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('register')
  async register(
    @Body()
    body: {
      name: string;
      phone: string;
      password: string;
      otp?: string;
      lineName?: string;
      department?: string;
    },
  ) {
    const isRegistrationOpen = process.env.DEMO_MODE === 'true' || process.env.REGISTRATION_OPEN === 'true';
    if (!isRegistrationOpen) {
      throw new ForbiddenException('ปิดรับการลงทะเบียนด้วยตนเองชั่วคราว กรุณาติดต่อเจ้าหน้าที่เพื่อสร้างบัญชี');
    }

    const name = String(body.name ?? '').trim().slice(0, 100);
    const phone = String(body.phone ?? '').trim();
    const password = String(body.password ?? '');
    const digits = phone.replace(/\D/g, '');
    if (!name || !digits || !password) throw new BadRequestException('กรุณากรอกข้อมูลให้ครบถ้วน');
    if (!/^0\d{8,9}$/.test(digits)) throw new BadRequestException('เบอร์โทรศัพท์ไม่ถูกต้อง');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new BadRequestException('รหัสผ่านต้องยาวอย่างน้อย 8 ตัว และมีทั้งตัวอักษรและตัวเลข');
    }

    const rawOtp = String(body.otp ?? '').trim();
    if (process.env.DEMO_MODE === 'true') {
      if (rawOtp !== '000000') {
        throw new BadRequestException('รหัส OTP ในโหมดเดโมคือ 000000');
      }
    } else {
      if (!/^\d{6}$/.test(rawOtp)) {
        throw new BadRequestException('รหัส OTP ไม่ถูกต้อง (ต้องเป็นตัวเลข 6 หลัก)');
      }
      const otpRecord = await this.db.prisma.otpCode.findFirst({
        where: {
          phone: digits,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: 5 },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!otpRecord) {
        throw new BadRequestException('ไม่พบรหัส OTP หรือรหัสหมดอายุแล้ว (กรุณาขอรหัสใหม่)');
      }
      await this.db.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const valid = await verifySecret(otpRecord.codeHash, rawOtp);
      if (!valid) {
        throw new BadRequestException('รหัส OTP ไม่ถูกต้อง');
      }
      await this.db.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() },
      });
    }

    if (this.db.accounts.some((a) => a.phone.replace(/\D/g, '') === digits || a.username === digits)) {
      throw new ConflictException('เบอร์โทรศัพท์นี้ลงทะเบียนแล้ว');
    }

    const hashedPassword = await hashSecret(password);
    const id = await this.db.nextId('u');
    const account: Account = {
      id,
      username: digits,
      password: hashedPassword,
      name,
      nickname: name.split(' ')[0] || name,
      initial: name.charAt(0) || 'ผ',
      role: 'USER',
      position: 'ประชาชน',
      department: String(body.department ?? '').trim().slice(0, 100) || 'ประชาชนทั่วไป',
      phone,
      lineName: String(body.lineName ?? '').slice(0, 50) || name.split(' ')[0],
      permissions: { ...DEFAULT_PERMISSIONS.USER },
      signature: null,
      pin: null,
      createdAt: new Date().toISOString(),
    };
    this.db.accounts.unshift(account);
    await this.db.persistAccount(account);
    await this.db.log('user', 'ผู้ใช้ใหม่ลงทะเบียน', account.name, {
      id: account.id,
      name: account.name,
      role: account.role,
    });
    const token = await this.db.createSession(account.id);
    return { token, account: this.db.toPublic(account) };
  }

  @Get('me')
  me(@CurrentUser() user: Account) {
    return this.db.toPublic(user);
  }

  @Post('signature')
  async saveSignature(@CurrentUser() user: Account, @Body() body: { signature: string }) {
    user.signature = requireDrawnSignature(body.signature, 'ผู้ใช้');
    await this.db.persistAccount(user);
    return this.db.toPublic(user);
  }

  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post('pin')
  async savePin(@CurrentUser() user: Account, @Body() body: { pin: string }) {
    if (!/^\d{6}$/.test(body.pin ?? '')) throw new BadRequestException('PIN ต้องเป็นตัวเลข 6 หลัก');
    if (!user.signature) {
      throw new BadRequestException('กรุณาเขียนและบันทึกลายเซ็นก่อนตั้งรหัส PIN');
    }
    user.pin = await hashSecret(body.pin);
    clearFailures(`pin:${user.id}`);
    await this.db.persistAccount(user);
    return this.db.toPublic(user);
  }

  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post('verify-pin')
  async verifyPin(@CurrentUser() user: Account, @Body() body: { pin: string }) {
    if (!user.pin) throw new BadRequestException('บัญชีนี้ยังไม่ได้ตั้งค่า PIN');
    const key = `pin:${user.id}`;
    assertNotLocked(key);
    if (!(await verifySecret(user.pin, String(body.pin ?? '')))) {
      recordFailure(key);
      throw new UnauthorizedException('รหัส PIN ไม่ถูกต้อง');
    }
    clearFailures(key);
    return { ok: true };
  }
}

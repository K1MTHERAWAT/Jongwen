import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกชื่อผู้ใช้' })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  password!: string;
}

export class DemoLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุ accountId' })
  accountId!: string;
}

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุเบอร์โทรศัพท์' })
  phone!: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  lineName?: string;

  @IsOptional()
  @IsString()
  otp?: string;
}

export class SetPinDto {
  @IsString()
  @Length(6, 6, { message: 'รหัส PIN ต้องมี 6 หลัก' })
  pin!: string;

  @IsOptional()
  @IsString()
  oldPin?: string;
}

export class VerifyPinDto {
  @IsString()
  @Length(6, 6, { message: 'รหัส PIN ต้องมี 6 หลัก' })
  pin!: string;
}

export class SetSignatureDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาส่งภาพลายมือชื่อ' })
  signature!: string;
}

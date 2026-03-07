import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'goku@dbz.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Goku' })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  username: string;

  @ApiProperty({ example: 'Kamehameha1!' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'goku@dbz.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Kamehameha1!' })
  @IsString()
  password: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

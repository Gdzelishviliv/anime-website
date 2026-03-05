import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
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

  @ApiProperty({ example: 'kamehameha123' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'goku@dbz.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'kamehameha123' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

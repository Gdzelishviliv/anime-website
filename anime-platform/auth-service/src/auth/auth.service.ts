import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/user.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { RedisService } from '../redis/redis.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = this.userRepository.create({
      email: dto.email,
      username: dto.username,
      password: hashedPassword,
    });

    const saved = await this.userRepository.save(user);

    // Emit USER_REGISTERED event
    await this.rabbitMQService.publish('user.registered', {
      userId: saved.id,
      email: saved.email,
      username: saved.username,
      createdAt: saved.createdAt,
    });

    const tokens = await this.generateTokens(saved);

    return {
      user: {
        id: saved.id,
        email: saved.email,
        username: saved.username,
        role: saved.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'username', 'password', 'role', 'isActive'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user, dto.rememberMe);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    const isBlacklisted = await this.redisService.get(
      `bl_refresh:${refreshToken}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Blacklist the old refresh token
      await this.redisService.set(
        `bl_refresh:${refreshToken}`,
        '1',
        7 * 24 * 60 * 60, // 7 days
      );

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(accessToken: string, refreshToken?: string) {
    // Blacklist the access token
    const decoded = this.jwtService.decode(accessToken) as any;
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redisService.set(`bl_access:${accessToken}`, '1', ttl);
      }
    }

    // Blacklist refresh token if provided
    if (refreshToken) {
      await this.redisService.set(
        `bl_refresh:${refreshToken}`,
        '1',
        7 * 24 * 60 * 60,
      );
    }

    return { message: 'Logged out successfully' };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.redisService.get(`bl_access:${token}`);
    return !!result;
  }

  private async generateTokens(user: User, rememberMe = false) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessExpiresIn = rememberMe ? '1h' : this.configService.get('JWT_EXPIRES_IN', '15m');
    const refreshExpiresIn = rememberMe ? '30d' : this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: accessExpiresIn }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: accessExpiresIn };
  }
}

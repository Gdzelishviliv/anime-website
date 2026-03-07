import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';
        const dbUrl = config.get('DATABASE_URL');
        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
            autoLoadEntities: true,
            synchronize: !isProduction,
          };
        }
        return {
          type: 'postgres',
          host: config.get('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get('DB_USER', 'postgres'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_NAME', 'auth_db'),
          autoLoadEntities: true,
          synchronize: !isProduction,
        };
      },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET environment variable is required');
        return {
          secret,
          signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
        };
      },
    }),
    AuthModule,
    RedisModule,
    RabbitMQModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
  ],
})
export class AppModule {}

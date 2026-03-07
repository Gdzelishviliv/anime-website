import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionModule } from './subscription/subscription.module';
import { RedisModule } from './redis/redis.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { JwtMiddleware } from './middleware/jwt.middleware';

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
          port: parseInt(config.get('DB_PORT', '5432'), 10),
          username: config.get('DB_USER', 'postgres'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_NAME', 'subscription_db'),
          autoLoadEntities: true,
          synchronize: !isProduction,
        };
      },
    }),
    SubscriptionModule,
    RedisModule,
    RabbitMQModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes('*');
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimeModule } from './anime/anime.module';
import { RedisModule } from './redis/redis.module';

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
          database: config.get('DB_NAME', 'anime_db'),
          autoLoadEntities: true,
          synchronize: !isProduction,
        };
      },
    }),
    AnimeModule,
    RedisModule,
  ],
})
export class AppModule {}

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
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'anime_user'),
        password: config.get('DB_PASSWORD', 'anime_secret_password'),
        database: config.get('DB_NAME', 'anime_db'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    AnimeModule,
    RedisModule,
  ],
})
export class AppModule {}

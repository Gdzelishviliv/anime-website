import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimeCache } from './entities/anime-cache.entity';
import { AnimeService } from './anime.service';
import { AnimeController } from './anime.controller';
import { JikanService } from './jikan.service';
import { ConsumetService } from './consumet.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([AnimeCache]), RedisModule],
  controllers: [AnimeController],
  providers: [AnimeService, JikanService, ConsumetService],
  exports: [AnimeService],
})
export class AnimeModule {}

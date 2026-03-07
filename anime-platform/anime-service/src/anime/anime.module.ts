import { Module } from '@nestjs/common';
import { AnimeController } from './anime.controller';
import { ConsumetService } from './consumet.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [AnimeController],
  providers: [ConsumetService],
})
export class AnimeModule {}

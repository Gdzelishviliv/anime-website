import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { WatchHistory } from './entities/watch-history.entity';
import { Favorite } from './entities/favorite.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserEventListener } from './user-event.listener';
import { RedisModule } from '../redis/redis.module';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProfile, WatchHistory, Favorite]),
    RedisModule,
    RabbitMQModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserEventListener],
  exports: [UserService],
})
export class UserModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreamFile } from './entities/stream-file.entity';
import { StreamingService } from './streaming.service';
import { StreamingController } from './streaming.controller';
import { MinioModule } from '../minio/minio.module';
import { RedisModule } from '../redis/redis.module';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StreamFile]),
    MinioModule,
    RedisModule,
    RabbitMQModule,
  ],
  controllers: [StreamingController],
  providers: [StreamingService],
  exports: [StreamingService],
})
export class StreamingModule {}

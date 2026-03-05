import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { UserService } from './user.service';

@Injectable()
export class UserEventListener implements OnModuleInit {
  private readonly logger = new Logger(UserEventListener.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    // Listen for USER_REGISTERED events from Auth Service
    await this.rabbitMQService.subscribe(
      'user-service.user-registered',
      'user.registered',
      async (msg) => {
        this.logger.log(`Received USER_REGISTERED event for user: ${msg.userId}`);
        try {
          await this.userService.createProfile({
            id: msg.userId,
            email: msg.email,
            username: msg.username,
          });
          this.logger.log(`Created profile for user: ${msg.userId}`);
        } catch (error) {
          this.logger.error(`Failed to create profile for user: ${msg.userId}`, error);
        }
      },
    );

    // Listen for USER_WATCHED_EPISODE events
    await this.rabbitMQService.subscribe(
      'user-service.user-watched',
      'user.watched.episode',
      async (msg) => {
        this.logger.log(`Received USER_WATCHED_EPISODE event for user: ${msg.userId}`);
        try {
          await this.userService.updateWatchProgress({
            userId: msg.userId,
            animeId: msg.animeId,
            episodeId: msg.episodeId,
            animeTitle: msg.animeTitle,
            episodeTitle: msg.episodeTitle,
            thumbnailUrl: msg.thumbnailUrl,
            progressSeconds: msg.progressSeconds,
            totalDurationSeconds: msg.totalDurationSeconds,
          });
        } catch (error) {
          this.logger.error('Failed to update watch progress via event', error);
        }
      },
    );

    // Listen for SUBSCRIPTION_ACTIVATED events
    await this.rabbitMQService.subscribe(
      'user-service.subscription-activated',
      'subscription.activated',
      async (msg) => {
        this.logger.log(
          `Received SUBSCRIPTION_ACTIVATED event for user: ${msg.userId}`,
        );
      },
    );
  }
}

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly exchange = 'anime_platform_events';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect(retries = 1): Promise<void> {
    try {
      const url = this.configService.get('RABBITMQ_URL', 'amqp://localhost:5672');
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      if (retries > 0) {
        this.logger.warn(`RabbitMQ connection failed, retrying... (${retries} left)`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.connect(retries - 1);
      }
      this.logger.error('Failed to connect to RabbitMQ — events will be unavailable', error.message);
    }
  }

  async publish(routingKey: string, message: any): Promise<void> {
    if (!this.channel) {
      this.logger.warn(`RabbitMQ not connected, skipping event: ${routingKey}`);
      return;
    }
    try {
      this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true, timestamp: Date.now() },
      );
    } catch (error) {
      this.logger.error(`Failed to publish event: ${routingKey}`, error);
    }
  }

  async subscribe(
    queue: string,
    routingKey: string,
    handler: (msg: any) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      this.logger.warn(`RabbitMQ not connected, skipping subscription: ${routingKey}`);
      return;
    }
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, this.exchange, routingKey);
    this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          this.channel.ack(msg);
        } catch (error) {
          this.logger.error(`Error processing message from ${queue}`, error);
          this.channel.nack(msg, false, false);
        }
      }
    });
    this.logger.log(`Subscribed to ${routingKey} on queue ${queue}`);
  }
}

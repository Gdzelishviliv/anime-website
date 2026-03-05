import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get('REDIS_HOST', 'localhost');
    if (!host) {
      this.logger.warn('REDIS_HOST is empty — Redis disabled, running without cache');
      return;
    }
    try {
      this.client = new Redis({
        host,
        port: parseInt(this.configService.get('REDIS_PORT', '6379'), 10),
        retryStrategy: (times: number) => {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      this.client.on('error', (err) => {
        this.logger.warn(`Redis error: ${err.message}`);
      });
      this.client.connect().catch(() => {
        this.logger.warn('Redis unavailable — running without cache');
        this.client = null;
      });
    } catch {
      this.logger.warn('Failed to create Redis client — running without cache');
      this.client = null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try { return await this.client.get(key); } catch { return null; }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch { /* ignore */ }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try { await this.client.del(key); } catch { /* ignore */ }
  }

  async setJSON(key: string, value: any, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}

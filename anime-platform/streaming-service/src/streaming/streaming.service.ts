import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { StreamFile } from './entities/stream-file.entity';
import { MinioService } from '../minio/minio.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly signedUrlSecret: string;
  private readonly signedUrlExpiry: number;

  constructor(
    @InjectRepository(StreamFile)
    private readonly streamFileRepo: Repository<StreamFile>,
    private readonly minioService: MinioService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly configService: ConfigService,
  ) {
    this.signedUrlSecret = this.configService.get(
      'SIGNED_URL_SECRET',
      'signed-url-secret',
    );
    this.signedUrlExpiry = this.configService.get<number>(
      'SIGNED_URL_EXPIRY',
      300,
    );
  }

  async getEpisodeStream(animeId: number, episodeNumber: number) {
    const streamFile = await this.streamFileRepo.findOne({
      where: { animeId, episodeNumber, status: 'ready' },
    });

    if (!streamFile) {
      throw new NotFoundException('Stream not found for this episode');
    }

    return streamFile;
  }

  /**
   * Generate a signed URL for streaming.
   * The URL expires after SIGNED_URL_EXPIRY seconds.
   */
  generateSignedUrl(
    streamFileId: string,
    userId: string,
  ): { url: string; expiresAt: number } {
    const expiresAt = Math.floor(Date.now() / 1000) + this.signedUrlExpiry;
    const payload = `${streamFileId}:${userId}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', this.signedUrlSecret)
      .update(payload)
      .digest('hex');

    const url = `/stream/${streamFileId}?userId=${userId}&expires=${expiresAt}&signature=${signature}`;

    return { url, expiresAt };
  }

  /**
   * Validate a signed streaming URL.
   */
  validateSignedUrl(
    streamFileId: string,
    userId: string,
    expires: number,
    signature: string,
  ): boolean {
    // Check if expired
    if (Math.floor(Date.now() / 1000) > expires) {
      return false;
    }

    const payload = `${streamFileId}:${userId}:${expires}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.signedUrlSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Get the HLS manifest (.m3u8) from MinIO.
   */
  async getManifest(streamFileId: string): Promise<string> {
    const streamFile = await this.streamFileRepo.findOne({
      where: { id: streamFileId },
    });

    if (!streamFile) {
      throw new NotFoundException('Stream file not found');
    }

    return this.minioService.getObjectAsString(streamFile.manifestKey);
  }

  /**
   * Get a video segment (.ts) from MinIO.
   */
  async getSegment(segmentKey: string): Promise<Buffer> {
    return this.minioService.getObjectAsBuffer(segmentKey);
  }

  /**
   * Get presigned URL for direct streaming from MinIO.
   */
  async getPresignedUrl(objectKey: string): Promise<string> {
    return this.minioService.getPresignedUrl(objectKey, this.signedUrlExpiry);
  }

  /**
   * List all available streams for an anime.
   */
  async getAnimeStreams(animeId: number): Promise<StreamFile[]> {
    return this.streamFileRepo.find({
      where: { animeId, status: 'ready' },
      order: { episodeNumber: 'ASC' },
    });
  }

  /**
   * Register a new stream file (admin operation).
   */
  async registerStream(data: {
    animeId: number;
    episodeNumber: number;
    title?: string;
    objectKey: string;
    manifestKey: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
  }): Promise<StreamFile> {
    const existing = await this.streamFileRepo.findOne({
      where: { animeId: data.animeId, episodeNumber: data.episodeNumber },
    });

    if (existing) {
      await this.streamFileRepo.update(existing.id, data);
      return { ...existing, ...data } as StreamFile;
    }

    const streamFile = this.streamFileRepo.create({
      ...data,
      status: 'ready',
    });
    return this.streamFileRepo.save(streamFile);
  }

  /**
   * Emit watch event via RabbitMQ
   */
  async emitWatchEvent(data: {
    userId: string;
    animeId: number;
    episodeId: number;
    animeTitle?: string;
    episodeTitle?: string;
    thumbnailUrl?: string;
    progressSeconds: number;
    totalDurationSeconds: number;
  }): Promise<void> {
    await this.rabbitMQService.publish('user.watched.episode', data);
  }

  /**
   * Seed demo stream files for portfolio demonstration.
   * Uses a public domain Big Buck Bunny HLS stream.
   */
  async seedDemoStreams(): Promise<StreamFile[]> {
    const demoStreams = [
      {
        animeId: 1,
        episodeNumber: 1,
        title: 'Demo Episode 1 - The Beginning',
        objectKey: 'demo/episode-1/',
        manifestKey: 'demo/episode-1/index.m3u8',
        thumbnailUrl: 'https://cdn.myanimelist.net/images/anime/4/19644l.jpg',
        durationSeconds: 596,
      },
      {
        animeId: 1,
        episodeNumber: 2,
        title: 'Demo Episode 2 - The Journey',
        objectKey: 'demo/episode-2/',
        manifestKey: 'demo/episode-2/index.m3u8',
        thumbnailUrl: 'https://cdn.myanimelist.net/images/anime/4/19644l.jpg',
        durationSeconds: 596,
      },
    ];

    const results: StreamFile[] = [];
    for (const stream of demoStreams) {
      results.push(await this.registerStream(stream));
    }
    return results;
  }
}

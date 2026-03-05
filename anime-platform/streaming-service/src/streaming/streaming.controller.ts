import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Headers,
  Res,
  ParseIntPipe,
  ForbiddenException,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { StreamingService } from './streaming.service';

@ApiTags('Streaming')
@Controller('streaming')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get('anime/:animeId/episodes')
  @ApiOperation({ summary: 'Get available streams for an anime' })
  async getAnimeStreams(@Param('animeId', ParseIntPipe) animeId: number) {
    return this.streamingService.getAnimeStreams(animeId);
  }

  @Get('anime/:animeId/episode/:episodeNumber')
  @ApiOperation({ summary: 'Get stream info for a specific episode' })
  async getEpisodeStream(
    @Param('animeId', ParseIntPipe) animeId: number,
    @Param('episodeNumber', ParseIntPipe) episodeNumber: number,
  ) {
    return this.streamingService.getEpisodeStream(animeId, episodeNumber);
  }

  @Get('signed-url/:streamFileId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a signed streaming URL (expires in 5 min)' })
  async getSignedUrl(
    @Param('streamFileId') streamFileId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.streamingService.generateSignedUrl(streamFileId, userId);
  }

  @Get('stream/:streamFileId')
  @ApiOperation({ summary: 'Stream HLS manifest via signed URL' })
  async streamManifest(
    @Param('streamFileId') streamFileId: string,
    @Query('userId') userId: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Res() res: Response,
  ) {
    const isValid = this.streamingService.validateSignedUrl(
      streamFileId,
      userId,
      parseInt(expires, 10),
      signature,
    );

    if (!isValid) {
      throw new ForbiddenException('Invalid or expired streaming URL');
    }

    const manifest = await this.streamingService.getManifest(streamFileId);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(manifest);
  }

  @Get('segment/:segmentKey(*)')
  @ApiOperation({ summary: 'Get a video segment (.ts)' })
  async getSegment(
    @Param('segmentKey') segmentKey: string,
    @Res() res: Response,
  ) {
    const segment = await this.streamingService.getSegment(segmentKey);
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(segment);
  }

  @Post('watch-event')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report watch progress' })
  async reportWatchEvent(
    @Headers('x-user-id') userId: string,
    @Body()
    body: {
      animeId: number;
      episodeId: number;
      animeTitle?: string;
      episodeTitle?: string;
      thumbnailUrl?: string;
      progressSeconds: number;
      totalDurationSeconds: number;
    },
  ) {
    await this.streamingService.emitWatchEvent({ userId, ...body });
    return { message: 'Watch event recorded' };
  }

  @Post('seed-demo')
  @ApiOperation({ summary: 'Seed demo stream files (portfolio only)' })
  async seedDemo() {
    return this.streamingService.seedDemoStreams();
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', service: 'streaming-service' };
  }
}

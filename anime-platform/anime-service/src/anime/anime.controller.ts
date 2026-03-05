import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import axios from 'axios';
import { AnimeService } from './anime.service';
import { ConsumetService } from './consumet.service';

@ApiTags('Anime')
@Controller('anime')
export class AnimeController {
  constructor(
    private readonly animeService: AnimeService,
    private readonly consumetService: ConsumetService,
  ) {}

  @Get('trending')
  @ApiOperation({ summary: 'Get trending (currently airing) anime' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTrending(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.animeService.getTrending(page || 1, limit || 25);
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top rated anime' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTop(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.animeService.getTopAnime(page || 1, limit || 25);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search anime by query' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'genres', required: false })
  async search(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('genres') genres?: string,
  ) {
    return this.animeService.searchAnime(query, page || 1, limit || 25, genres);
  }

  @Get('genres')
  @ApiOperation({ summary: 'Get list of all genres' })
  async getGenres() {
    return this.animeService.getGenres();
  }

  @Get('season/now')
  @ApiOperation({ summary: 'Get current season anime' })
  async getSeasonNow(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.animeService.getSeasonNow(page || 1, limit || 25);
  }

  @Get('genre/:genreId')
  @ApiOperation({ summary: 'Get anime by genre' })
  async getByGenre(
    @Param('genreId', ParseIntPipe) genreId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.animeService.getAnimeByGenre(genreId, page || 1, limit || 25);
  }

  @Get('watch/search')
  @ApiOperation({ summary: 'Search for watchable anime by title' })
  @ApiQuery({ name: 'q', required: true })
  async watchSearch(@Query('q') query: string) {
    const results = await this.consumetService.searchAnime(query);
    return { data: results };
  }

  @Get('watch/episodes/:animeSlug')
  @ApiOperation({ summary: 'Get episodes for an anime' })
  async watchEpisodes(
    @Param('animeSlug') animeSlug: string,
    @Query('provider') provider?: string,
  ) {
    const info = await this.consumetService.getAnimeInfo(animeSlug, provider);
    return { data: info };
  }

  @Get('watch/find-episodes')
  @ApiOperation({ summary: 'Find episodes by anime title (auto-search)' })
  @ApiQuery({ name: 'title', required: true })
  async findEpisodesByTitle(@Query('title') title: string) {
    const result = await this.consumetService.findEpisodes(title);
    return { data: result };
  }

  @Get('watch/sources/:episodeId(*)')
  @ApiOperation({ summary: 'Get streaming sources for an episode' })
  async watchSources(
    @Param('episodeId') episodeId: string,
    @Query('provider') provider?: string,
  ) {
    const sources = await this.consumetService.getEpisodeSources(episodeId, provider);
    return { data: sources };
  }

  @Get('watch/proxy')
  @ApiOperation({ summary: 'Proxy streaming content with required headers' })
  async proxyStream(
    @Query('url') url: string,
    @Query('referer') referer: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!url) {
      throw new HttpException('url parameter is required', HttpStatus.BAD_REQUEST);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new HttpException('Invalid URL', HttpStatus.BAD_REQUEST);
    }

    const allowedHosts = ['uwucdn.top', 'kwik.cx', 'megacloud.tv', 'rapid-cloud.co'];
    const isAllowed = allowedHosts.some(host => parsedUrl.hostname.endsWith(host));
    if (!isAllowed) {
      throw new HttpException('Host not allowed', HttpStatus.FORBIDDEN);
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      if (referer) {
        headers['Referer'] = referer;
      }
      // Forward Range header for seeking in MP4
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const response = await axios.get(url, {
        headers,
        responseType: 'stream',
        timeout: 30000,
      });

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const statusCode = response.status;

      // For M3U8 manifests, buffer and rewrite URLs
      if (contentType.includes('mpegurl') || contentType.includes('m3u8') || url.endsWith('.m3u8')) {
        const chunks: Buffer[] = [];
        for await (const chunk of response.data) {
          chunks.push(Buffer.from(chunk));
        }
        let m3u8Content = Buffer.concat(chunks).toString('utf-8');
        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
        const proxyRef = encodeURIComponent(referer || '');

        m3u8Content = m3u8Content.replace(/URI="([^"]+)"/g, (_match, keyUrl) => {
          const absoluteKey = keyUrl.startsWith('http') ? keyUrl : baseUrl + keyUrl;
          return `URI="/anime/watch/proxy?url=${encodeURIComponent(absoluteKey)}&referer=${proxyRef}"`;
        });
        m3u8Content = m3u8Content.replace(/^(?!#)(https?:\/\/.+)$/gm, (match) => {
          return `/anime/watch/proxy?url=${encodeURIComponent(match)}&referer=${proxyRef}`;
        });
        m3u8Content = m3u8Content.replace(/^(?!#)(?!\/anime\/watch\/proxy)([^\s].+)$/gm, (match) => {
          const absoluteUrl = baseUrl + match;
          return `/anime/watch/proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${proxyRef}`;
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(m3u8Content);
        return;
      }

      // Stream all other content (MP4, segments, keys) directly via pipe
      res.status(statusCode);
      res.setHeader('Content-Type', contentType);
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      if (response.headers['content-range']) {
        res.setHeader('Content-Range', response.headers['content-range']);
      }
      if (response.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
      }
      response.data.pipe(res);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(502).json({ message: 'Failed to proxy stream' });
      }
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get anime by MAL ID' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.animeService.getAnimeById(id);
  }

  @Get(':id/episodes')
  @ApiOperation({ summary: 'Get anime episodes' })
  async getEpisodes(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
  ) {
    return this.animeService.getAnimeEpisodes(id, page || 1);
  }

  @Get(':id/recommendations')
  @ApiOperation({ summary: 'Get anime recommendations' })
  async getRecommendations(@Param('id', ParseIntPipe) id: number) {
    return this.animeService.getRecommendations(id);
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', service: 'anime-service' };
  }
}

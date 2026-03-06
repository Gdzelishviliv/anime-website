import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnimeCache } from './entities/anime-cache.entity';
import { JikanService } from './jikan.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AnimeService {
  private readonly logger = new Logger(AnimeService.name);
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor(
    @InjectRepository(AnimeCache)
    private readonly animeCacheRepo: Repository<AnimeCache>,
    private readonly jikanService: JikanService,
    private readonly redisService: RedisService,
  ) {}

  async getTrending(page = 1, limit = 25) {
    const cacheKey = `trending:${page}:${limit}`;
    const cached = await this.redisService.getJSON<any>(cacheKey);
    if (cached) return cached;

    const result = await this.jikanService.getTopAnime(page, limit, 'airing');

    // Cache in Redis
    await this.redisService.setJSON(cacheKey, result, this.CACHE_TTL);

    // Also cache individual anime in DB for fast access
    if (result.data) {
      for (const anime of result.data) {
        await this.cacheAnime(anime);
      }
    }

    return result;
  }

  async getTopAnime(page = 1, limit = 25) {
    const cacheKey = `top:${page}:${limit}`;
    const cached = await this.redisService.getJSON<any>(cacheKey);
    if (cached) return cached;

    const result = await this.jikanService.getTopAnime(page, limit);
    await this.redisService.setJSON(cacheKey, result, this.CACHE_TTL);

    if (result.data) {
      for (const anime of result.data) {
        await this.cacheAnime(anime);
      }
    }

    return result;
  }

  async getAnimeById(id: number) {
    const cacheKey = `anime:${id}`;
    const cached = await this.redisService.getJSON<any>(cacheKey);
    if (cached) return cached;

    // Check DB cache
    const dbCached = await this.animeCacheRepo.findOne({ where: { malId: id } });
    if (dbCached) {
      await this.redisService.setJSON(cacheKey, dbCached, this.CACHE_TTL);
      return dbCached;
    }

    // Fetch from Jikan
    const anime = await this.jikanService.getAnimeById(id);
    if (!anime) throw new NotFoundException('Anime not found');

    const cached_data = await this.cacheAnime(anime);
    await this.redisService.setJSON(cacheKey, cached_data, this.CACHE_TTL);
    return cached_data;
  }

  async getAnimeEpisodes(id: number, page = 1) {
    const cacheKey = `anime:${id}:episodes:${page}`;
    const cached = await this.redisService.getJSON<any>(cacheKey);
    if (cached) return cached;

    const result = await this.jikanService.getAnimeEpisodes(id, page);
    await this.redisService.setJSON(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async searchAnime(query: string, page = 1, limit = 25, genres?: string) {
    const cacheKey = `search:${query}:${page}:${limit}:${genres || ''}`;
    const cached = await this.redisService.getJSON<any>(cacheKey);
    if (cached) return cached;

    const result = await this.jikanService.searchAnime(query, page, limit, genres);
    await this.redisService.setJSON(cacheKey, result, 300); // 5 min cache for search
    return result;
  }

  async getAnimeByGenre(genreId: number, page = 1, limit = 25) {
    const cacheKey = `genre:${genreId}:${page}:${limit}`;
    const cached = await this.redisService.getJSON<any>(cacheKey);
    if (cached) return cached;

    const result = await this.jikanService.getAnimeByGenre(genreId, page, limit);
    await this.redisService.setJSON(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async getGenres() {
    const cacheKey = 'genres:all';
    const cached = await this.redisService.getJSON<any>(cacheKey);
    if (cached) return cached;

    const result = await this.jikanService.getGenres();
    await this.redisService.setJSON(cacheKey, result, 3600); // 1 hour cache
    return result;
  }

  async getSeasonNow(page = 1, limit = 25) {
    const cacheKey = `season:now:${page}:${limit}`;
    const cached = await this.redisService.getJSON<any>(cacheKey);
    if (cached) return cached;

    const result = await this.jikanService.getSeasonNow(page, limit);
    await this.redisService.setJSON(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async getRecommendations(id: number) {
    const cacheKey = `anime:${id}:recommendations`;
    const cached = await this.redisService.getJSON<any>(cacheKey);
    if (cached) return cached;

    const result = await this.jikanService.getAnimeRecommendations(id);
    await this.redisService.setJSON(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async getAnimeRelations(id: number) {
    const cacheKey = `anime:${id}:relations`;
    const cached = await this.redisService.getJSON<any>(cacheKey);
    if (cached) return cached;

    const anime = await this.jikanService.getAnimeById(id);
    if (!anime) throw new NotFoundException('Anime not found');

    const result = {
      relations: (anime.relations || [])
        .map((r: any) => ({
          relation: r.relation,
          entry: (r.entry || [])
            .filter((e: any) => e.type === 'anime')
            .map((e: any) => ({ mal_id: e.mal_id, name: e.name })),
        }))
        .filter((r: any) => r.entry.length > 0),
      status: anime.status,
      broadcast: anime.broadcast,
      airing: anime.airing,
      aired: anime.aired,
    };

    await this.redisService.setJSON(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  private async cacheAnime(anime: any): Promise<AnimeCache> {
    const mapped = this.jikanService.mapToCache(anime);
    try {
      const existing = await this.animeCacheRepo.findOne({
        where: { malId: mapped.malId },
      });
      if (existing) {
        await this.animeCacheRepo.update(mapped.malId, mapped);
        return { ...existing, ...mapped } as AnimeCache;
      }
      return await this.animeCacheRepo.save(this.animeCacheRepo.create(mapped));
    } catch (error) {
      this.logger.warn(`Failed to cache anime ${mapped.malId}: ${error}`);
      return mapped as AnimeCache;
    }
  }
}

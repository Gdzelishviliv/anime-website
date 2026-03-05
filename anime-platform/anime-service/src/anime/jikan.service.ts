import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  getMockTopAnime,
  getMockAnimeById,
  getMockSearchResults,
  getMockAnimeByGenre,
  getMockGenres,
  getMockSeasonNow,
} from './mock-data';

@Injectable()
export class JikanService {
  private readonly logger = new Logger(JikanService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.get('JIKAN_API_URL', 'https://api.jikan.moe/v4'),
      timeout: 10000,
    });
  }

  async getTopAnime(page = 1, limit = 25, filter?: string): Promise<any> {
    try {
      const params: any = { page, limit };
      if (filter) params.filter = filter;
      const { data } = await this.client.get('/top/anime', { params });
      return data;
    } catch (error) {
      this.logger.warn('Jikan API unavailable, using mock data', error.message);
      return getMockTopAnime(page, limit, filter);
    }
  }

  async getAnimeById(id: number): Promise<any> {
    try {
      const { data } = await this.client.get(`/anime/${id}/full`);
      return data.data;
    } catch (error) {
      this.logger.warn(`Jikan API unavailable for anime ${id}, using mock data`, error.message);
      return getMockAnimeById(id);
    }
  }

  async getAnimeEpisodes(id: number, page = 1): Promise<any> {
    try {
      const { data } = await this.client.get(`/anime/${id}/episodes`, {
        params: { page },
      });
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch episodes for anime ${id}`, error.message);
      return { data: [], pagination: { last_visible_page: 0, has_next_page: false } };
    }
  }

  async searchAnime(query: string, page = 1, limit = 25, genres?: string): Promise<any> {
    try {
      const params: any = { q: query, page, limit };
      if (genres) params.genres = genres;
      const { data } = await this.client.get('/anime', { params });
      return data;
    } catch (error) {
      this.logger.warn(`Jikan API unavailable for search: ${query}, using mock data`, error.message);
      return getMockSearchResults(query, page, limit);
    }
  }

  async getAnimeByGenre(genreId: number, page = 1, limit = 25): Promise<any> {
    try {
      const { data } = await this.client.get('/anime', {
        params: { genres: genreId.toString(), page, limit },
      });
      return data;
    } catch (error) {
      this.logger.warn(`Jikan API unavailable for genre ${genreId}, using mock data`, error.message);
      return getMockAnimeByGenre(genreId, page, limit);
    }
  }

  async getGenres(): Promise<any> {
    try {
      const { data } = await this.client.get('/genres/anime');
      return data;
    } catch (error) {
      this.logger.warn('Jikan API unavailable, using mock genres', error.message);
      return getMockGenres();
    }
  }

  async getSeasonNow(page = 1, limit = 25): Promise<any> {
    try {
      const { data } = await this.client.get('/seasons/now', {
        params: { page, limit },
      });
      return data;
    } catch (error) {
      this.logger.warn('Jikan API unavailable, using mock season data', error.message);
      return getMockSeasonNow(page, limit);
    }
  }

  async getAnimeRecommendations(id: number): Promise<any> {
    try {
      const { data } = await this.client.get(`/anime/${id}/recommendations`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch recommendations for anime ${id}`, error.message);
      return { data: [] };
    }
  }

  /**
   * Maps raw Jikan API anime data to our local cache format.
   */
  mapToCache(anime: any) {
    return {
      malId: anime.mal_id,
      title: anime.title,
      titleJapanese: anime.title_japanese,
      titleEnglish: anime.title_english,
      synopsis: anime.synopsis,
      imageUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      trailerUrl: anime.trailer?.url,
      score: anime.score,
      scoredBy: anime.scored_by,
      rank: anime.rank,
      popularity: anime.popularity,
      members: anime.members,
      episodes: anime.episodes,
      status: anime.status,
      rating: anime.rating,
      source: anime.source,
      duration: anime.duration,
      genres: anime.genres?.map((g: any) => ({ malId: g.mal_id, name: g.name })),
      studios: anime.studios?.map((s: any) => ({ malId: s.mal_id, name: s.name })),
      season: anime.season,
      year: anime.year,
      type: anime.type,
    };
  }
}

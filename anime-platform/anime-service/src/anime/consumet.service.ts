import { Injectable, Logger } from '@nestjs/common';
import { HiAnime } from 'aniwatch';

@Injectable()
export class ConsumetService {
  private readonly logger = new Logger(ConsumetService.name);
  private scraper: InstanceType<typeof HiAnime.Scraper>;

  constructor() {
    this.scraper = new HiAnime.Scraper();
  }

  async searchAnime(query: string) {
    try {
      const results = await this.scraper.search(query);
      return (results.animes || []).map((a: any) => ({
        id: a.id,
        title: a.name,
        image: a.poster,
        type: a.type,
        episodes: a.episodes,
        provider: 'hianime',
      }));
    } catch (error) {
      this.logger.error(`Search failed for "${query}": ${(error as Error).message}`);
      return [];
    }
  }

  async getAnimeInfo(animeId: string, _provider?: string) {
    try {
      const info = await this.scraper.getInfo(animeId);
      const episodesData = await this.scraper.getEpisodes(animeId);
      const anime = info.anime;
      return {
        id: anime?.info?.id,
        malId: anime?.info?.malId,
        title: anime?.info?.name,
        image: anime?.info?.poster,
        description: anime?.info?.description,
        stats: anime?.info?.stats,
        moreInfo: anime?.moreInfo,
        totalEpisodes: episodesData.totalEpisodes,
        episodes: (episodesData.episodes || []).map((ep: any) => ({
          id: ep.episodeId,
          number: ep.number,
          title: ep.title || `Episode ${ep.number}`,
          isFiller: ep.isFiller,
        })),
        seasons: ((info as any).seasons || []).map((s: any) => ({
          ...s,
          poster: s.poster?.replace('/thumbnail/100x200/', '/thumbnail/300x400/'),
        })),
        relatedAnimes: (info as any).relatedAnimes || [],
      };
    } catch (error) {
      this.logger.error(`getAnimeInfo failed for "${animeId}": ${(error as Error).message}`);
      return null;
    }
  }

  async getEpisodeSources(episodeId: string, _provider?: string, category?: 'sub' | 'dub') {
    // Try servers in order: hd-2 (VidCloud, most reliable), hd-1 (VidStreaming)
    const servers: Array<'hd-2' | 'hd-1'> = ['hd-2', 'hd-1'];
    const categories: Array<'sub' | 'dub'> = category ? [category] : ['sub', 'dub'];

    for (const server of servers) {
      for (const cat of categories) {
        try {
          this.logger.log(`Trying server="${server}" category="${cat}" for "${episodeId}"`);
          const result: any = await this.scraper.getEpisodeSources(episodeId, server, cat);
          if (result?.sources?.length) {
            this.logger.log(`Got ${result.sources.length} source(s) from ${server}/${cat}`);
            return {
              sources: result.sources.map((s: any) => ({
                url: s.url,
                quality: s.isM3U8 ? 'auto' : 'default',
                isM3U8: s.isM3U8 || false,
              })),
              headers: result.headers || { Referer: 'https://megacloud.blog/' },
              subtitles: (result.tracks || [])
                .filter((t: any) => t.lang !== 'thumbnails')
                .map((t: any) => ({ url: t.url, lang: t.lang })),
              intro: result.intro,
              outro: result.outro,
              category: cat,
            };
          }
        } catch (error) {
          this.logger.warn(`Server ${server}/${cat} failed: ${(error as Error).message}`);
        }
      }
    }

    this.logger.error(`All servers failed for "${episodeId}"`);
    return null;
  }

  /**
   * Normalize a title string for comparison: lowercase, strip punctuation/extra spaces.
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Compute a simple word-overlap similarity score between two titles (0-1).
   */
  private titleSimilarity(a: string, b: string): number {
    const na = this.normalizeTitle(a);
    const nb = this.normalizeTitle(b);
    if (na === nb) return 1;

    // Check if one title contains the other entirely
    if (na.includes(nb) || nb.includes(na)) return 0.9;

    const wordsA = new Set(na.split(' '));
    const wordsB = new Set(nb.split(' '));
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  async findEpisodes(title: string) {
    try {
      const searchResults = await this.searchAnime(title);
      if (!searchResults.length) {
        this.logger.warn(`No results found for "${title}"`);
        return { episodes: [], animeId: null, provider: null };
      }

      // Score each result by title similarity, preferring TV type
      const scored = searchResults.map((r: any) => {
        let score = this.titleSimilarity(title, r.title);
        // Boost exact normalized match
        if (this.normalizeTitle(title) === this.normalizeTitle(r.title)) {
          score = 2;
        }
        // Small boost for TV type
        if (r.type === 'TV') score += 0.1;
        return { ...r, score };
      });

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);
      const bestMatch = scored[0];

      // Reject matches with low similarity (prevents "One Piece" → "One Punch Man")
      if (bestMatch.score < 0.5) {
        this.logger.warn(
          `findEpisodes: query="${title}" -> best match "${bestMatch.title}" rejected (score=${bestMatch.score.toFixed(2)} < 0.5)`,
        );
        return { episodes: [], animeId: null, provider: null };
      }

      this.logger.log(
        `findEpisodes: query="${title}" -> matched "${bestMatch.title}" (id=${bestMatch.id}, score=${bestMatch.score.toFixed(2)})`,
      );

      const info = await this.getAnimeInfo(bestMatch.id);
      if (!info || !info.episodes?.length) {
        return { episodes: [], animeId: bestMatch.id, provider: 'hianime' };
      }

      return {
        animeId: bestMatch.id,
        provider: 'hianime',
        title: info.title,
        image: bestMatch.image,
        totalEpisodes: info.totalEpisodes || info.episodes.length,
        episodes: info.episodes.map((ep: any) => ({
          id: ep.id,
          number: ep.number,
          title: ep.title || `Episode ${ep.number}`,
        })),
      };
    } catch (error) {
      this.logger.error(`findEpisodes failed for "${title}": ${(error as Error).message}`);
      return { episodes: [], animeId: null, provider: null };
    }
  }

  async getHomePage() {
    try {
      const home = await this.scraper.getHomePage();
      return {
        spotlightAnimes: home.spotlightAnimes || [],
        trendingAnimes: home.trendingAnimes || [],
        latestEpisodeAnimes: home.latestEpisodeAnimes || [],
        topUpcomingAnimes: home.topUpcomingAnimes || [],
        top10Animes: home.top10Animes || {},
        topAiringAnimes: home.topAiringAnimes || [],
        mostPopularAnimes: home.mostPopularAnimes || [],
        mostFavoriteAnimes: home.mostFavoriteAnimes || [],
        latestCompletedAnimes: home.latestCompletedAnimes || [],
        genres: home.genres || [],
      };
    } catch (error) {
      this.logger.error(`getHomePage failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getCategoryAnime(category: string, page = 1) {
    try {
      const result = await this.scraper.getCategoryAnime(category as any, page);
      return {
        animes: (result.animes || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          poster: a.poster,
          duration: a.duration,
          type: a.type,
          rating: a.rating,
          episodes: a.episodes,
        })),
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        hasNextPage: result.hasNextPage,
      };
    } catch (error) {
      this.logger.error(`getCategoryAnime failed for "${category}": ${(error as Error).message}`);
      return { animes: [], totalPages: 0, currentPage: 1, hasNextPage: false };
    }
  }

  async getGenreAnime(genre: string, page = 1) {
    try {
      const result = await this.scraper.getGenreAnime(genre, page);
      return {
        animes: (result.animes || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          poster: a.poster,
          duration: a.duration,
          type: a.type,
          rating: a.rating,
          episodes: a.episodes,
        })),
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        hasNextPage: result.hasNextPage,
        genreName: result.genreName,
      };
    } catch (error) {
      this.logger.error(`getGenreAnime failed for "${genre}": ${(error as Error).message}`);
      return { animes: [], totalPages: 0, currentPage: 1, hasNextPage: false };
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ANIME } from '@consumet/extensions';

@Injectable()
export class ConsumetService {
  private readonly logger = new Logger(ConsumetService.name);
  private animePahe: InstanceType<typeof ANIME.AnimePahe>;
  private hianime: InstanceType<typeof ANIME.Hianime>;

  constructor() {
    this.animePahe = new ANIME.AnimePahe();
    this.hianime = new ANIME.Hianime();
  }

  async searchAnime(query: string) {
    // Try Hianime first (more reliable for sources), then AnimePahe
    try {
      const results = await this.hianime.search(query);
      const hianimeResults = (results.results || []).map((r: any) => ({ ...r, provider: 'hianime' }));
      if (hianimeResults.length) return hianimeResults;
    } catch (error) {
      this.logger.warn(`Hianime search failed: ${(error as Error).message}`);
    }

    try {
      const results = await this.animePahe.search(query);
      return results.results || [];
    } catch (error) {
      this.logger.error(`AnimePahe search also failed for "${query}": ${(error as Error).message}`);
      return [];
    }
  }

  async getAnimeInfo(animeId: string, provider?: string) {
    const fetcher = provider === 'hianime' ? this.hianime : this.animePahe;
    try {
      return await fetcher.fetchAnimeInfo(animeId);
    } catch (error) {
      this.logger.error(`fetchAnimeInfo failed for "${animeId}": ${(error as Error).message}`);
      return null;
    }
  }

  async getEpisodeSources(episodeId: string, provider?: string) {
    const fetcher = provider === 'hianime' ? this.hianime : this.animePahe;
    try {
      this.logger.log(`Fetching sources for "${episodeId}" with provider "${provider || 'animepahe'}"`);
      const sources = await fetcher.fetchEpisodeSources(episodeId);
      this.logger.log(`Sources result: sourcesCount=${sources?.sources?.length}, downloadCount=${sources?.download?.length}`);
      if (sources && (sources.sources?.length || sources.download?.length)) {
        return sources;
      }
      this.logger.warn(`No usable sources from ${provider || 'animepahe'} for "${episodeId}"`);
    } catch (error) {
      this.logger.error(`fetchEpisodeSources failed (${provider || 'animepahe'}): ${(error as Error).message}`);
    }
    return null;
  }

  async findEpisodes(title: string) {
    try {
      const searchResults = await this.searchAnime(title);
      if (!searchResults.length) {
        this.logger.warn(`No results found for "${title}"`);
        return { episodes: [], animeId: null, provider: null };
      }

      // Prefer TV results over specials/movies
      const tvMatch = searchResults.find((r: any) => r.type === 'TV');
      const bestMatch = tvMatch || searchResults[0];
      const provider = bestMatch.provider || 'animepahe';

      const info = await this.getAnimeInfo(bestMatch.id, provider);
      if (!info || !info.episodes) {
        return { episodes: [], animeId: bestMatch.id, provider };
      }

      return {
        animeId: bestMatch.id,
        provider,
        title: info.title,
        image: bestMatch.image,
        totalEpisodes: info.totalEpisodes || info.episodes.length,
        episodes: info.episodes.map((ep: any) => ({
          id: ep.id,
          number: ep.number,
          title: ep.title || `Episode ${ep.number}`,
          image: ep.image,
          url: ep.url,
        })),
      };
    } catch (error) {
      this.logger.error(`findEpisodes failed for "${title}": ${(error as Error).message}`);
      return { episodes: [], animeId: null, provider: null };
    }
  }
}

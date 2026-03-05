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
      return {
        id: info.anime?.info?.id,
        title: info.anime?.info?.name,
        image: info.anime?.info?.poster,
        totalEpisodes: episodesData.totalEpisodes,
        episodes: (episodesData.episodes || []).map((ep: any) => ({
          id: ep.episodeId,
          number: ep.number,
          title: ep.title || `Episode ${ep.number}`,
          isFiller: ep.isFiller,
        })),
      };
    } catch (error) {
      this.logger.error(`getAnimeInfo failed for "${animeId}": ${(error as Error).message}`);
      return null;
    }
  }

  async getEpisodeSources(episodeId: string, _provider?: string) {
    // Try servers in order: hd-2 (VidCloud, most reliable), hd-1 (VidStreaming)
    const servers: Array<'hd-2' | 'hd-1'> = ['hd-2', 'hd-1'];
    const categories: Array<'sub' | 'dub'> = ['sub', 'dub'];

    for (const server of servers) {
      for (const category of categories) {
        try {
          this.logger.log(`Trying server="${server}" category="${category}" for "${episodeId}"`);
          const result: any = await this.scraper.getEpisodeSources(episodeId, server, category);
          if (result?.sources?.length) {
            this.logger.log(`Got ${result.sources.length} source(s) from ${server}/${category}`);
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
            };
          }
        } catch (error) {
          this.logger.warn(`Server ${server}/${category} failed: ${(error as Error).message}`);
        }
      }
    }

    this.logger.error(`All servers failed for "${episodeId}"`);
    return null;
  }

  async findEpisodes(title: string) {
    try {
      const searchResults = await this.searchAnime(title);
      if (!searchResults.length) {
        this.logger.warn(`No results found for "${title}"`);
        return { episodes: [], animeId: null, provider: null };
      }

      const tvMatch = searchResults.find((r: any) => r.type === 'TV');
      const bestMatch = tvMatch || searchResults[0];

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
}

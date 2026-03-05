import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { WatchHistory } from './entities/watch-history.entity';
import { Favorite } from './entities/favorite.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(WatchHistory)
    private readonly historyRepo: Repository<WatchHistory>,
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
  ) {}

  // ---- Profile ----

  async createProfile(data: {
    id: string;
    email: string;
    username: string;
  }): Promise<UserProfile> {
    const profile = this.profileRepo.create(data);
    return this.profileRepo.save(profile);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.profileRepo.findOne({ where: { id: userId } });
    if (!profile) {
      // Auto-create profile if it doesn't exist (e.g. when RabbitMQ event was missed)
      return this.createProfile({ id: userId, email: '', username: 'User' });
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    data: { username?: string; avatarUrl?: string; bio?: string },
  ): Promise<UserProfile> {
    await this.profileRepo.update(userId, data);
    return this.getProfile(userId);
  }

  // ---- Watch History ----

  async getWatchHistory(userId: string, limit = 20): Promise<WatchHistory[]> {
    return this.historyRepo.find({
      where: { userProfileId: userId },
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  async getContinueWatching(userId: string): Promise<WatchHistory[]> {
    return this.historyRepo.find({
      where: { userProfileId: userId, completed: false },
      order: { updatedAt: 'DESC' },
      take: 10,
    });
  }

  async updateWatchProgress(data: {
    userId: string;
    animeId: number;
    episodeId: number;
    animeTitle?: string;
    episodeTitle?: string;
    thumbnailUrl?: string;
    progressSeconds: number;
    totalDurationSeconds: number;
  }): Promise<WatchHistory> {
    let entry = await this.historyRepo.findOne({
      where: {
        userProfileId: data.userId,
        animeId: data.animeId,
        episodeId: data.episodeId,
      },
    });

    const completed =
      data.totalDurationSeconds > 0 &&
      data.progressSeconds / data.totalDurationSeconds > 0.9;

    if (entry) {
      entry.progressSeconds = data.progressSeconds;
      entry.totalDurationSeconds = data.totalDurationSeconds;
      entry.completed = completed;
      if (data.animeTitle) entry.animeTitle = data.animeTitle;
      if (data.episodeTitle) entry.episodeTitle = data.episodeTitle;
      if (data.thumbnailUrl) entry.thumbnailUrl = data.thumbnailUrl;
    } else {
      entry = this.historyRepo.create({
        userProfileId: data.userId,
        animeId: data.animeId,
        episodeId: data.episodeId,
        animeTitle: data.animeTitle,
        episodeTitle: data.episodeTitle,
        thumbnailUrl: data.thumbnailUrl,
        progressSeconds: data.progressSeconds,
        totalDurationSeconds: data.totalDurationSeconds,
        completed,
      });
    }

    return this.historyRepo.save(entry);
  }

  // ---- Favorites ----

  async getFavorites(userId: string): Promise<Favorite[]> {
    return this.favoriteRepo.find({
      where: { userProfileId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async addFavorite(data: {
    userId: string;
    animeId: number;
    animeTitle?: string;
    thumbnailUrl?: string;
  }): Promise<Favorite> {
    // Ensure user profile exists
    await this.getProfile(data.userId);

    const existing = await this.favoriteRepo.findOne({
      where: { userProfileId: data.userId, animeId: data.animeId },
    });
    if (existing) return existing;

    const fav = this.favoriteRepo.create({
      userProfileId: data.userId,
      animeId: data.animeId,
      animeTitle: data.animeTitle,
      thumbnailUrl: data.thumbnailUrl,
    });
    return this.favoriteRepo.save(fav);
  }

  async removeFavorite(userId: string, animeId: number): Promise<void> {
    await this.favoriteRepo.delete({
      userProfileId: userId,
      animeId,
    });
  }

  async isFavorite(userId: string, animeId: number): Promise<boolean> {
    const count = await this.favoriteRepo.count({
      where: { userProfileId: userId, animeId },
    });
    return count > 0;
  }
}

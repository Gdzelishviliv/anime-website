import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private requireAuth(userId: string) {
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Headers('x-user-id') userId: string) {
    this.requireAuth(userId);
    return this.userService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @Headers('x-user-id') userId: string,
    @Body() body: { username?: string; avatarUrl?: string; bio?: string },
  ) {
    this.requireAuth(userId);
    return this.userService.updateProfile(userId, body);
  }

  @Get('watch-history')
  @ApiOperation({ summary: 'Get watch history' })
  async getWatchHistory(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: number,
  ) {
    this.requireAuth(userId);
    return this.userService.getWatchHistory(userId, limit);
  }

  @Get('continue-watching')
  @ApiOperation({ summary: 'Get continue watching list' })
  async getContinueWatching(@Headers('x-user-id') userId: string) {
    this.requireAuth(userId);
    return this.userService.getContinueWatching(userId);
  }

  @Post('watch-progress')
  @ApiOperation({ summary: 'Update watch progress' })
  async updateWatchProgress(
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
    this.requireAuth(userId);
    return this.userService.updateWatchProgress({ userId, ...body });
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Get favorite anime list' })
  async getFavorites(@Headers('x-user-id') userId: string) {
    this.requireAuth(userId);
    return this.userService.getFavorites(userId);
  }

  @Post('favorites')
  @ApiOperation({ summary: 'Add anime to favorites' })
  async addFavorite(
    @Headers('x-user-id') userId: string,
    @Body()
    body: { animeId: number; animeTitle?: string; thumbnailUrl?: string },
  ) {
    this.requireAuth(userId);
    return this.userService.addFavorite({ userId, ...body });
  }

  @Delete('favorites/:animeId')
  @ApiOperation({ summary: 'Remove anime from favorites' })
  async removeFavorite(
    @Headers('x-user-id') userId: string,
    @Param('animeId', ParseIntPipe) animeId: number,
  ) {
    this.requireAuth(userId);
    await this.userService.removeFavorite(userId, animeId);
    return { message: 'Removed from favorites' };
  }

  @Get('favorites/:animeId/check')
  @ApiOperation({ summary: 'Check if anime is in favorites' })
  async checkFavorite(
    @Headers('x-user-id') userId: string,
    @Param('animeId', ParseIntPipe) animeId: number,
  ) {
    this.requireAuth(userId);
    return { isFavorite: await this.userService.isFavorite(userId, animeId) };
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', service: 'user-service' };
  }
}

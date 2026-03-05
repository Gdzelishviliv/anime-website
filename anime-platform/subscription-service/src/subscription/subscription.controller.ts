import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPlan } from './entities/subscription.entity';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current subscription for user' })
  async getCurrentSubscription(@Headers('x-user-id') userId: string) {
    return this.subscriptionService.getSubscription(userId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activate a subscription plan (simulated)' })
  async activate(
    @Headers('x-user-id') userId: string,
    @Body() body: { plan: SubscriptionPlan },
  ) {
    return this.subscriptionService.activate(userId, body.plan);
  }

  @Post('deactivate')
  @ApiOperation({ summary: 'Deactivate subscription (reverts to free)' })
  async deactivate(@Headers('x-user-id') userId: string) {
    return this.subscriptionService.deactivate(userId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Check if subscription is active' })
  async checkStatus(@Headers('x-user-id') userId: string) {
    const isActive = await this.subscriptionService.isActive(userId);
    return { isActive };
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', service: 'subscription-service' };
  }
}

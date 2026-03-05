import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

const PLAN_FEATURES = {
  [SubscriptionPlan.FREE]: {
    maxQuality: '480p',
    adsEnabled: true,
    simultaneousStreams: 1,
    downloadEnabled: false,
  },
  [SubscriptionPlan.BASIC]: {
    maxQuality: '1080p',
    adsEnabled: false,
    simultaneousStreams: 2,
    downloadEnabled: false,
  },
  [SubscriptionPlan.PREMIUM]: {
    maxQuality: '4K',
    adsEnabled: false,
    simultaneousStreams: 4,
    downloadEnabled: true,
  },
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async getSubscription(userId: string): Promise<Subscription> {
    let sub = await this.subRepo.findOne({ where: { userId } });

    if (!sub) {
      // Auto-create free subscription
      sub = this.subRepo.create({
        userId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        features: PLAN_FEATURES[SubscriptionPlan.FREE],
      });
      sub = await this.subRepo.save(sub);
    }

    return sub;
  }

  async activate(
    userId: string,
    plan: SubscriptionPlan,
  ): Promise<Subscription> {
    let sub = await this.subRepo.findOne({ where: { userId } });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

    if (sub) {
      sub.plan = plan;
      sub.status = SubscriptionStatus.ACTIVE;
      sub.expiresAt = expiresAt;
      sub.features = PLAN_FEATURES[plan];
    } else {
      sub = this.subRepo.create({
        userId,
        plan,
        status: SubscriptionStatus.ACTIVE,
        expiresAt,
        features: PLAN_FEATURES[plan],
      });
    }

    const saved = await this.subRepo.save(sub);

    // Emit SUBSCRIPTION_ACTIVATED event
    await this.rabbitMQService.publish('subscription.activated', {
      userId,
      plan,
      expiresAt: expiresAt.toISOString(),
      features: PLAN_FEATURES[plan],
    });

    this.logger.log(`Subscription activated for user ${userId}: ${plan}`);

    return saved;
  }

  async deactivate(userId: string): Promise<Subscription> {
    const sub = await this.subRepo.findOne({ where: { userId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    sub.plan = SubscriptionPlan.FREE;
    sub.status = SubscriptionStatus.INACTIVE;
    sub.features = PLAN_FEATURES[SubscriptionPlan.FREE];

    return this.subRepo.save(sub);
  }

  async isActive(userId: string): Promise<boolean> {
    const sub = await this.subRepo.findOne({ where: { userId } });
    if (!sub) return false;

    if (sub.status !== SubscriptionStatus.ACTIVE) return false;

    // Check expiry
    if (sub.expiresAt && new Date() > sub.expiresAt) {
      sub.status = SubscriptionStatus.EXPIRED;
      sub.plan = SubscriptionPlan.FREE;
      sub.features = PLAN_FEATURES[SubscriptionPlan.FREE];
      await this.subRepo.save(sub);
      return false;
    }

    return true;
  }

  async getPlans() {
    return [
      {
        name: 'Free',
        plan: SubscriptionPlan.FREE,
        price: 0,
        features: PLAN_FEATURES[SubscriptionPlan.FREE],
      },
      {
        name: 'Basic',
        plan: SubscriptionPlan.BASIC,
        price: 7.99,
        features: PLAN_FEATURES[SubscriptionPlan.BASIC],
      },
      {
        name: 'Premium',
        plan: SubscriptionPlan.PREMIUM,
        price: 14.99,
        features: PLAN_FEATURES[SubscriptionPlan.PREMIUM],
      },
    ];
  }
}

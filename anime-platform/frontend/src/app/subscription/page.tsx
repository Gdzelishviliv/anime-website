'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Crown, Check, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { subscriptionApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/Loading';

const plans = [
  {
    name: 'FREE',
    price: '$0',
    period: 'forever',
    color: 'from-dark-700 to-dark-800',
    borderColor: 'border-dark-600',
    features: [
      '480p streaming quality',
      'Ad-supported viewing',
      '1 simultaneous stream',
      'Basic anime library',
    ],
    limitations: ['No downloads', 'Limited quality'],
  },
  {
    name: 'BASIC',
    price: '$7.99',
    period: '/month',
    color: 'from-blue-900/40 to-dark-800',
    borderColor: 'border-blue-500/30',
    badge: 'Popular',
    features: [
      '1080p Full HD streaming',
      'No advertisements',
      '2 simultaneous streams',
      'Full anime library',
    ],
    limitations: ['No downloads'],
  },
  {
    name: 'PREMIUM',
    price: '$14.99',
    period: '/month',
    color: 'from-yellow-900/30 to-dark-800',
    borderColor: 'border-yellow-500/30',
    badge: 'Best Value',
    features: [
      '4K Ultra HD streaming',
      'No advertisements',
      '4 simultaneous streams',
      'Full anime library',
      'Offline downloads',
      'Early access to new releases',
    ],
    limitations: [],
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [currentPlan, setCurrentPlan] = useState<string>('FREE');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscription();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadSubscription = async () => {
    try {
      const res = await subscriptionApi.getCurrent();
      setCurrentPlan(res.data.plan || 'FREE');
    } catch (err) {
      // Default to FREE if service unavailable
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (plan: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setActivating(plan);
    try {
      await subscriptionApi.activate(plan);
      setCurrentPlan(plan);
    } catch (err: any) {
      console.error('Failed to activate plan:', err);
    } finally {
      setActivating(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-3">Choose Your Plan</h1>
          <p className="text-dark-400 max-w-lg mx-auto">
            Unlock the full anime experience. This is a portfolio demo — no real payments are processed.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, idx) => {
            const isCurrentPlan = currentPlan === plan.name;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative rounded-xl border ${plan.borderColor} bg-gradient-to-b ${plan.color} p-6 flex flex-col ${
                  isCurrentPlan ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6 pt-2">
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-dark-400 text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-dark-200">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleActivate(plan.name)}
                  disabled={isCurrentPlan || activating === plan.name}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-primary-500/20 text-primary-400 cursor-default'
                      : 'btn-primary disabled:opacity-50'
                  }`}
                >
                  {activating === plan.name ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : (
                    `Select ${plan.name}`
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-dark-500 text-xs mt-8 max-w-md mx-auto">
          This is a portfolio demonstration project. No real payments are processed. 
          Plan activation simulates subscription management via RabbitMQ events.
        </p>
      </div>
    </div>
  );
}

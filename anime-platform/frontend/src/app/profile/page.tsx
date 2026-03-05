'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Clock, Heart, Play, LogOut, Crown } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { userApi, subscriptionApi } from '@/lib/api';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { LoadingSpinner } from '@/components/ui/Loading';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, [isAuthenticated]);

  const loadProfile = async () => {
    try {
      const [profileRes, historyRes, continueRes, favoritesRes, subRes] = await Promise.allSettled([
        userApi.getProfile(),
        userApi.getWatchHistory(),
        userApi.getContinueWatching(),
        userApi.getFavorites(),
        subscriptionApi.getCurrent(),
      ]);

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
      if (historyRes.status === 'fulfilled') setWatchHistory(historyRes.value.data);
      if (continueRes.status === 'fulfilled') setContinueWatching(continueRes.value.data);
      if (favoritesRes.status === 'fulfilled') setFavorites(favoritesRes.value.data);
      if (subRes.status === 'fulfilled') setSubscription(subRes.value.data);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading) return <LoadingSpinner />;

  const planColors: Record<string, string> = {
    FREE: 'text-dark-400',
    BASIC: 'text-blue-400',
    PREMIUM: 'text-yellow-400',
  };

  return (
    <div className="min-h-screen">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-primary-900/30 to-dark-900 py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center md:items-start gap-6"
          >
            <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold text-white">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-white">{user?.username || 'User'}</h1>
              <p className="text-dark-400 mt-1">{user?.email}</p>

              {subscription && (
                <div className="flex items-center gap-2 mt-3 justify-center md:justify-start">
                  <Crown className={`w-4 h-4 ${planColors[subscription.plan] || 'text-dark-400'}`} />
                  <span className={`text-sm font-medium ${planColors[subscription.plan] || 'text-dark-400'}`}>
                    {subscription.plan} Plan
                  </span>
                  {subscription.plan === 'FREE' && (
                    <Link href="/subscription" className="text-xs text-primary-400 hover:underline ml-2">
                      Upgrade
                    </Link>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-dark-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-primary-400" />
              Continue Watching
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueWatching.map((item: any) => (
                <Link
                  key={item.id}
                  href={`/anime/${item.animeId}/episode/${item.episodeId}`}
                  className="card p-4 hover:border-primary-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-dark-700 rounded-lg flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">Anime #{item.animeId}</p>
                      <p className="text-dark-400 text-sm">Episode {item.episodeId}</p>
                      <div className="mt-1.5 w-full bg-dark-700 rounded-full h-1.5">
                        <div
                          className="bg-primary-500 h-1.5 rounded-full"
                          style={{
                            width: `${item.totalDurationSeconds ? (item.progressSeconds / item.totalDurationSeconds) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-dark-700 mb-6">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Watch History
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'favorites'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <Heart className="w-4 h-4" />
            Favorites ({favorites.length})
          </button>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'history' && (
            <div>
              {watchHistory.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-400">No watch history yet</p>
                  <Link href="/browse" className="text-primary-400 text-sm hover:underline mt-2 inline-block">
                    Browse anime
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {watchHistory.map((item: any) => (
                    <Link
                      key={item.id}
                      href={`/anime/${item.animeId}/episode/${item.episodeId}`}
                      className="card p-4 flex items-center gap-4 hover:border-dark-600 transition-colors"
                    >
                      <div className="w-12 h-12 bg-dark-700 rounded flex items-center justify-center">
                        <Play className="w-5 h-5 text-dark-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Anime #{item.animeId}</p>
                        <p className="text-dark-400 text-sm">
                          Episode {item.episodeId} • {Math.floor(item.progressSeconds / 60)}m watched
                          {item.completed && ' • Completed'}
                        </p>
                      </div>
                      <span className="text-dark-500 text-xs">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div>
              {favorites.length === 0 ? (
                <div className="text-center py-16">
                  <Heart className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-400">No favorites yet</p>
                  <Link href="/browse" className="text-primary-400 text-sm hover:underline mt-2 inline-block">
                    Discover anime to add
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {favorites.map((fav: any) => (
                    <Link key={fav.id} href={`/anime/${fav.animeId}`}>
                      <div className="card p-3 text-center hover:border-primary-500/50 transition-colors">
                        <Heart className="w-6 h-6 text-red-400 mx-auto mb-2" />
                        <p className="text-white text-sm">Anime #{fav.animeId}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Star,
  Calendar,
  Clock,
  Film,
  Heart,
  Play,
  Users,
  Award,
} from 'lucide-react';
import { animeApi, userApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { AnimeGrid } from '@/components/anime/AnimeGrid';

export default function AnimeDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string, 10);
  const { isAuthenticated } = useAuthStore();

  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const animeRes = await animeApi.getById(id);
      const animeData = animeRes.data?.data || animeRes.data;
      setAnime(animeData);

      // Fetch episodes and recommendations in parallel
      const [episodesRes, recsRes] = await Promise.allSettled([
        animeApi.getEpisodes(id),
        animeApi.getRecommendations(id),
      ]);

      if (episodesRes.status === 'fulfilled') {
        setEpisodes(episodesRes.value.data?.data || []);
      }
      if (recsRes.status === 'fulfilled') {
        const recsData = recsRes.value.data?.data || [];
        setRecommendations(recsData.slice(0, 6).map((r: any) => r.entry));
      }

      // Check if favorited
      if (isAuthenticated) {
        try {
          const favRes = await userApi.checkFavorite(id);
          setIsFavorite(favRes.data.isFavorite);
        } catch {
          // Ignore
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load anime');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) return;
    try {
      if (isFavorite) {
        await userApi.removeFavorite(id);
        setIsFavorite(false);
      } else {
        await userApi.addFavorite({
          animeId: id,
          animeTitle: anime?.title,
          thumbnailUrl: anime?.imageUrl || anime?.images?.jpg?.large_image_url,
        });
        setIsFavorite(true);
      }
    } catch {
      // Ignore
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;
  if (!anime) return <ErrorDisplay message="Anime not found" />;

  const imageUrl =
    anime.images?.jpg?.large_image_url ||
    anime.imageUrl ||
    '/placeholder.jpg';

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative h-[400px] overflow-hidden">
        <Image
          src={imageUrl}
          alt={anime.title}
          fill
          className="object-cover blur-2xl opacity-30 scale-110"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-64 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-shrink-0"
          >
            <div className="relative w-[250px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl">
              <Image
                src={imageUrl}
                alt={anime.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-dark-100 mb-2">
              {anime.title}
            </h1>
            {(anime.title_english || anime.titleEnglish) && (
              <p className="text-dark-400 text-lg mb-4">
                {anime.title_english || anime.titleEnglish}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {anime.score && (
                <div className="flex items-center space-x-1 bg-yellow-500/10 text-yellow-400 px-3 py-1.5 rounded-lg">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  <span className="font-semibold">{anime.score}</span>
                </div>
              )}
              {anime.rank && (
                <div className="flex items-center space-x-1 text-dark-400">
                  <Award className="w-4 h-4" />
                  <span className="text-sm">Rank #{anime.rank}</span>
                </div>
              )}
              {anime.members && (
                <div className="flex items-center space-x-1 text-dark-400">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">
                    {(anime.members / 1000).toFixed(0)}K members
                  </span>
                </div>
              )}
              {anime.episodes && (
                <div className="flex items-center space-x-1 text-dark-400">
                  <Film className="w-4 h-4" />
                  <span className="text-sm">{anime.episodes} episodes</span>
                </div>
              )}
              {anime.duration && (
                <div className="flex items-center space-x-1 text-dark-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{anime.duration}</span>
                </div>
              )}
              {(anime.year || anime.season) && (
                <div className="flex items-center space-x-1 text-dark-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {anime.season} {anime.year}
                  </span>
                </div>
              )}
            </div>

            {/* Genres */}
            {anime.genres && anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {anime.genres.map((genre: any) => (
                  <span
                    key={genre.mal_id || genre.malId}
                    className="bg-dark-800 text-dark-300 text-xs px-3 py-1.5 rounded-full border border-dark-700"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mb-8">
              <Link
                href={`/anime/${id}/episode/1`}
                className="btn-primary flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Watch Now</span>
              </Link>
              {isAuthenticated && (
                <button
                  onClick={toggleFavorite}
                  className={`btn-secondary flex items-center space-x-2 ${
                    isFavorite ? 'text-red-400 border-red-400/50' : ''
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${isFavorite ? 'fill-red-400' : ''}`}
                  />
                  <span>{isFavorite ? 'Favorited' : 'Add to Favorites'}</span>
                </button>
              )}
            </div>

            {/* Synopsis */}
            {anime.synopsis && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-dark-100 mb-3">
                  Synopsis
                </h2>
                <p className="text-dark-400 leading-relaxed whitespace-pre-line">
                  {anime.synopsis}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Episodes */}
        {episodes.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-bold text-dark-100 mb-6">Episodes</h2>
            <div className="grid gap-3">
              {episodes.map((ep: any, idx: number) => (
                <Link
                  key={ep.mal_id || idx}
                  href={`/anime/${id}/episode/${idx + 1}`}
                  className="card p-4 flex items-center justify-between hover:border-primary-500/50 transition-all group"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-dark-500 font-mono text-sm w-8">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-dark-200 font-medium group-hover:text-primary-400 transition-colors">
                        {ep.title || `Episode ${idx + 1}`}
                      </h3>
                      {ep.aired && (
                        <span className="text-dark-500 text-xs">
                          {new Date(ep.aired).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Play className="w-5 h-5 text-dark-600 group-hover:text-primary-400 transition-colors" />
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="mt-12 pb-12">
            <AnimeGrid anime={recommendations} title="You Might Also Like" />
          </section>
        )}
      </div>
    </div>
  );
}

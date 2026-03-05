'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Search, ChevronDown, ChevronUp, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import { animeApi } from '@/lib/api';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { AnimeGridSkeleton } from '@/components/ui/Loading';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';

export default function BrowsePage() {
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [anime, setAnime] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnime, setLoadingAnime] = useState(false);
  const [genresLoading, setGenresLoading] = useState(true);
  const [error, setError] = useState('');
  const [genreSearch, setGenreSearch] = useState('');
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    // Load genres first, then anime with small delay to avoid Jikan rate limiting
    try {
      setGenresLoading(true);
      const genresRes = await animeApi.getGenres();
      setGenres(genresRes.data.data || genresRes.data || []);
    } catch (err) {
      console.error('Failed to load genres:', err);
    } finally {
      setGenresLoading(false);
    }
    // Small delay to avoid Jikan rate limit (3 req/s)
    await new Promise(r => setTimeout(r, 400));
    await loadTopAnime();
  };

  const loadTopAnime = async () => {
    try {
      const res = await animeApi.getTop(1);
      const data = res.data.data || res.data || [];
      setAnime(data);
      setHasMore(data.length >= 20);
    } catch (err: any) {
      setError(err.message || 'Failed to load anime');
    } finally {
      setLoading(false);
    }
  };

  const loadByGenre = async (genreId: number) => {
    if (selectedGenre === genreId) return; // Already selected
    setSelectedGenre(genreId);
    setLoadingAnime(true);
    setError('');
    setPage(1);
    try {
      const res = await animeApi.getByGenre(genreId, 1);
      const data = res.data.data || res.data || [];
      setAnime(data);
      setHasMore(data.length >= 20);
    } catch (err: any) {
      setError(err.message || 'Failed to load anime for this genre');
    } finally {
      setLoadingAnime(false);
    }
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingAnime(true);
    try {
      const res = selectedGenre
        ? await animeApi.getByGenre(selectedGenre, nextPage)
        : await animeApi.getTop(nextPage);
      const data = res.data.data || res.data || [];
      setAnime((prev) => [...prev, ...data]);
      setHasMore(data.length >= 20);
    } catch (err: any) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingAnime(false);
    }
  };

  const clearFilter = () => {
    setSelectedGenre(null);
    setError('');
    setLoading(true);
    loadTopAnime();
  };

  if (loading && genresLoading) return <AnimeGridSkeleton />;
  if (error && anime.length === 0 && !genresLoading)
    return <ErrorDisplay message={error} onRetry={() => { setError(''); setLoading(true); loadInitialData(); }} />;

  const selectedGenreName = genres.find((g: any) => g.mal_id === selectedGenre)?.name;

  // Filter genres by search
  const filteredGenres = genreSearch
    ? genres.filter((g: any) => g.name.toLowerCase().includes(genreSearch.toLowerCase()))
    : genres;

  // Show limited genres unless expanded
  const VISIBLE_GENRE_COUNT = 24;
  const displayedGenres = showAllGenres ? filteredGenres : filteredGenres.slice(0, VISIBLE_GENRE_COUNT);
  const hasMoreGenres = filteredGenres.length > VISIBLE_GENRE_COUNT && !genreSearch;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              {selectedGenreName ? (
                <>
                  <Sparkles className="w-7 h-7 text-primary-400" />
                  {selectedGenreName} Anime
                </>
              ) : (
                <>
                  <TrendingUp className="w-7 h-7 text-primary-400" />
                  Browse Anime
                </>
              )}
            </h1>
            {selectedGenre && (
              <p className="text-dark-400 text-sm mt-1">
                Showing anime in the {selectedGenreName} genre
              </p>
            )}
          </motion.div>

          {selectedGenre && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={clearFilter}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:border-dark-600 transition-all text-sm"
            >
              <X className="w-4 h-4" />
              Clear Filter
            </motion.button>
          )}
        </div>

        {/* Genre Filter Section — Always Visible */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-dark-900/80 backdrop-blur-sm rounded-xl border border-dark-800 p-5">
            {/* Genre header + search */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-dark-300">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filter by Genre</span>
                {genres.length > 0 && (
                  <span className="text-xs text-dark-500">({genres.length})</span>
                )}
              </div>
              {genres.length > 15 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
                  <input
                    type="text"
                    placeholder="Search genres..."
                    value={genreSearch}
                    onChange={(e) => setGenreSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 w-44"
                  />
                </div>
              )}
            </div>

            {/* Genre Pills */}
            {genresLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-8 w-20 rounded-full bg-dark-800 animate-pulse" />
                ))}
              </div>
            ) : genres.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-dark-500 text-sm">Failed to load genres</p>
                <button
                  onClick={loadInitialData}
                  className="mt-2 text-primary-400 hover:text-primary-300 text-xs flex items-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {displayedGenres.map((genre: any) => (
                      <motion.button
                        key={genre.mal_id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => loadByGenre(genre.mal_id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                          selectedGenre === genre.mal_id
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25 ring-1 ring-primary-400'
                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white border border-dark-700/50 hover:border-dark-600'
                        }`}
                      >
                        {genre.name}
                        {genre.count && (
                          <span className={`ml-1.5 text-[10px] ${
                            selectedGenre === genre.mal_id ? 'text-primary-200' : 'text-dark-500'
                          }`}>
                            {genre.count.toLocaleString()}
                          </span>
                        )}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Show More / Less */}
                {hasMoreGenres && (
                  <button
                    onClick={() => setShowAllGenres(!showAllGenres)}
                    className="mt-3 flex items-center gap-1 text-xs text-dark-400 hover:text-primary-400 transition-colors mx-auto"
                  >
                    {showAllGenres ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        Show All ({filteredGenres.length})
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Anime Grid */}
        <AnimatePresence mode="wait">
          {loadingAnime && anime.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AnimeGridSkeleton />
            </motion.div>
          ) : !loadingAnime && anime.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <p className="text-dark-400 text-lg">No anime found.</p>
              <p className="text-dark-500 text-sm mt-2">
                The upstream API may be temporarily unavailable. Please try again later.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={`grid-${selectedGenre || 'top'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {anime.map((item: any, idx: number) => (
                  <motion.div
                    key={item.mal_id || idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                  >
                    <AnimeCard anime={item} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loadingAnime && anime.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Load More */}
        {hasMore && !loadingAnime && anime.length > 0 && (
          <div className="flex justify-center mt-10">
            <button onClick={loadMore} className="btn-secondary px-8">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

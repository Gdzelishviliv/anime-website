'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search as SearchIcon } from 'lucide-react';
import { animeApi } from '@/lib/api';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { AnimeGridSkeleton } from '@/components/ui/Loading';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (q: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await animeApi.search(q);
      setResults(res.data.data || res.data || []);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            {query ? (
              <>
                Results for &ldquo;<span className="text-primary-400">{query}</span>&rdquo;
              </>
            ) : (
              'Search Anime'
            )}
          </h1>
          {searched && !loading && (
            <p className="text-dark-400 text-sm">{results.length} results found</p>
          )}
        </motion.div>

        {!query && !searched && (
          <div className="flex flex-col items-center justify-center py-20">
            <SearchIcon className="w-16 h-16 text-dark-600 mb-4" />
            <p className="text-dark-400 text-lg">Use the search bar above to find anime</p>
          </div>
        )}

        {loading && <AnimeGridSkeleton />}

        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <SearchIcon className="w-16 h-16 text-dark-600 mb-4" />
            <p className="text-dark-400 text-lg">No results found for &ldquo;{query}&rdquo;</p>
            <p className="text-dark-500 text-sm mt-2">Try a different search term</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((anime: any, idx: number) => (
              <motion.div
                key={anime.mal_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.5) }}
              >
                <AnimeCard anime={anime} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

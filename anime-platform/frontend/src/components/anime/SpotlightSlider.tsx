'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface SpotlightAnime {
  id: string;
  name: string;
  poster: string;
  description?: string;
  type?: string;
  episodes?: { sub?: number; dub?: number };
  otherInfo?: string[];
}

interface SpotlightSliderProps {
  animes: SpotlightAnime[];
}

export function SpotlightSlider({ animes }: SpotlightSliderProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % animes.length);
  }, [animes.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + animes.length) % animes.length);
  }, [animes.length]);

  // Auto-rotate every 6 seconds
  useEffect(() => {
    if (animes.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, animes.length]);

  if (!animes.length) return null;

  const anime = animes[current];
  const epCount = anime.episodes?.sub || anime.episodes?.dub || 0;

  return (
    <div className="relative w-full h-[400px] sm:h-[500px] overflow-hidden rounded-2xl group">
      {/* Background image */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          initial={{ opacity: 0, x: direction * 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * 100 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <Image
            src={anime.poster}
            alt={anime.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-dark-950/30" />
        </motion.div>
      </AnimatePresence>

      {/* Content overlay */}
      <div className="relative z-10 h-full flex items-end pb-12 sm:pb-16 px-6 sm:px-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded">
              SPOTLIGHT
            </span>
            {anime.type && (
              <span className="bg-dark-800/80 text-dark-200 text-xs px-2.5 py-1 rounded">
                {anime.type}
              </span>
            )}
            {epCount > 0 && (
              <span className="bg-dark-800/80 text-dark-200 text-xs px-2.5 py-1 rounded">
                {epCount} eps
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3 line-clamp-2">
            {anime.name}
          </h2>

          {anime.description && (
            <p className="text-dark-300 text-sm sm:text-base line-clamp-3 mb-5">
              {anime.description}
            </p>
          )}

          <Link
            href={`/watch/${anime.id}`}
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <Play className="w-5 h-5 fill-white" />
            Watch Now
          </Link>
        </div>
      </div>

      {/* Nav arrows */}
      {animes.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-dark-900/60 hover:bg-dark-900/90 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-dark-900/60 hover:bg-dark-900/90 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {animes.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {animes.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > current ? 1 : -1);
                setCurrent(i);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current
                  ? 'bg-primary-400 w-6'
                  : 'bg-dark-500 hover:bg-dark-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

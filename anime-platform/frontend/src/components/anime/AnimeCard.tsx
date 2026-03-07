'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface AnimeCardProps {
  anime: {
    id?: string;
    title?: string;
    name?: string;
    imageUrl?: string;
    poster?: string;
    score?: number;
    rating?: string;
    episodes?: number | { sub?: number; dub?: number };
    status?: string;
    type?: string;
    duration?: string;
    href?: string;
  };
  index?: number;
}

export function AnimeCard({ anime, index = 0 }: AnimeCardProps) {
  const href = anime.href || `/watch/${anime.id}`;
  const title = anime.title || anime.name || 'Untitled';
  const imageUrl =
    anime.imageUrl ||
    anime.poster ||
    '/placeholder.jpg';
  const episodeCount = typeof anime.episodes === 'object'
    ? (anime.episodes?.sub || anime.episodes?.dub || 0)
    : anime.episodes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={href} className="group block">
        <div className="card hover:border-primary-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10">
          <div className="relative aspect-[3/4] overflow-hidden">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {anime.score ? (
              <div className="absolute top-2 right-2 bg-dark-900/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-medium text-dark-100">
                  {anime.score.toFixed(1)}
                </span>
              </div>
            ) : anime.rating ? (
              <div className="absolute top-2 right-2 bg-dark-900/90 backdrop-blur-sm rounded-md px-2 py-1">
                <span className="text-xs font-medium text-dark-100">
                  {anime.rating}
                </span>
              </div>
            ) : null}

            {anime.type && (
              <div className="absolute top-2 left-2 bg-primary-600/90 backdrop-blur-sm rounded-md px-2 py-1">
                <span className="text-xs font-medium text-white">{anime.type}</span>
              </div>
            )}
          </div>

          <div className="p-3">
            <h3 className="text-sm font-medium text-dark-100 leading-5 h-10 line-clamp-2 group-hover:text-primary-400 transition-colors">
              {title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {episodeCount ? (
                <span className="text-xs text-dark-500">
                  {episodeCount} eps
                </span>
              ) : null}
              {anime.duration && (
                <span className="text-xs text-dark-500">• {anime.duration}</span>
              )}
              {anime.status && (
                <span className="text-xs text-dark-500">• {anime.status}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

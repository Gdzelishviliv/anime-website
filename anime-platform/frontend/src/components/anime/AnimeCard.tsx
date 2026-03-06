'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface AnimeCardProps {
  anime: {
    mal_id?: number;
    malId?: number;
    title: string;
    images?: { jpg?: { large_image_url?: string; image_url?: string } };
    imageUrl?: string;
    score?: number;
    episodes?: number;
    status?: string;
    type?: string;
    href?: string;
  };
  index?: number;
}

export function AnimeCard({ anime, index = 0 }: AnimeCardProps) {
  const id = anime.mal_id || anime.malId;
  const href = anime.href || `/anime/${id}`;
  const imageUrl =
    anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url ||
    anime.imageUrl ||
    '/placeholder.jpg';

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
              alt={anime.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {anime.score && (
              <div className="absolute top-2 right-2 bg-dark-900/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-medium text-dark-100">
                  {anime.score.toFixed(1)}
                </span>
              </div>
            )}

            {anime.type && (
              <div className="absolute top-2 left-2 bg-primary-600/90 backdrop-blur-sm rounded-md px-2 py-1">
                <span className="text-xs font-medium text-white">{anime.type}</span>
              </div>
            )}
          </div>

          <div className="p-3">
            <h3 className="text-sm font-medium text-dark-100 leading-5 h-10 line-clamp-2 group-hover:text-primary-400 transition-colors">
              {anime.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {anime.episodes && (
                <span className="text-xs text-dark-500">
                  {anime.episodes} eps
                </span>
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

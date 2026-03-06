'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Layers, ChevronRight, Tv, Film, Clapperboard } from 'lucide-react';
import { animeApi } from '@/lib/api';

interface RelationEntry {
  mal_id: number;
  name: string;
}

interface Relation {
  relation: string;
  entry: RelationEntry[];
}

export interface RelationsData {
  relations: Relation[];
  status: string;
  broadcast: { day: string; time: string; timezone: string; string: string } | null;
  airing: boolean;
  aired: { from: string; to: string | null } | null;
}

export function useAnimeRelations(animeId: number) {
  const [data, setData] = useState<RelationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await animeApi.getRelations(animeId);
        if (!cancelled) setData(res.data?.data);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [animeId]);

  return { data, loading };
}

// Order relation types by relevance
const RELATION_ORDER: Record<string, number> = {
  Prequel: 0,
  Sequel: 1,
  'Parent Story': 2,
  'Side Story': 3,
  'Full Story': 4,
  Summary: 5,
  'Alternative Version': 6,
  'Spin-Off': 7,
  Other: 8,
  Character: 9,
  Adaptation: 10,
};

const RELATION_ICONS: Record<string, typeof Tv> = {
  Prequel: Tv,
  Sequel: Tv,
  'Side Story': Film,
  'Alternative Version': Clapperboard,
  'Spin-Off': Clapperboard,
};

const RELATION_COLORS: Record<string, string> = {
  Prequel: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Sequel: 'text-green-400 bg-green-500/10 border-green-500/20',
  'Parent Story': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Side Story': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Full Story': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Summary: 'text-dark-400 bg-dark-500/10 border-dark-500/20',
  'Alternative Version': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'Spin-Off': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Other: 'text-dark-400 bg-dark-500/10 border-dark-500/20',
};

export function RelatedSeasons({ data }: { data: RelationsData | null }) {
  if (!data) return null;

  const relations = data.relations
    .filter((r) => r.relation !== 'Adaptation') // Skip manga/LN adaptations
    .sort((a, b) => (RELATION_ORDER[a.relation] ?? 99) - (RELATION_ORDER[b.relation] ?? 99));

  if (relations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Related Seasons</h3>
      </div>

      <div className="space-y-2">
        {relations.map((rel) =>
          rel.entry.map((entry) => {
            const Icon = RELATION_ICONS[rel.relation] || Film;
            const colorClass = RELATION_COLORS[rel.relation] || RELATION_COLORS.Other;

            return (
              <Link
                key={entry.mal_id}
                href={`/anime/${entry.mal_id}/episode/1`}
                className="group flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-primary-500/30 hover:bg-dark-800/80 transition-all"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-200 group-hover:text-white transition-colors truncate">
                    {entry.name}
                  </p>
                  <p className="text-xs text-dark-500">{rel.relation}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-dark-600 group-hover:text-primary-400 transition-colors shrink-0" />
              </Link>
            );
          }),
        )}
      </div>
    </motion.div>
  );
}

export function AiringSchedule({ data }: { data: RelationsData | null }) {
  if (!data || !data.airing || !data.broadcast?.string) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-4 px-4 py-3 rounded-xl bg-primary-500/[0.08] border border-primary-500/20"
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400/50 animate-ping" />
        </div>
        <span className="text-xs font-semibold text-primary-300 uppercase tracking-wider">Currently Airing</span>
      </div>
      <p className="text-sm text-dark-200 mt-1.5">
        New episodes: <span className="text-white font-medium">{data.broadcast.string}</span>
      </p>
    </motion.div>
  );
}

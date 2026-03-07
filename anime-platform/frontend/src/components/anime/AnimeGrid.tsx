'use client';

import { AnimeCard } from './AnimeCard';

interface AnimeGridProps {
  anime: any[];
  title?: string;
}

export function AnimeGrid({ anime, title }: AnimeGridProps) {
  return (
    <section>
      {title && (
        <h2 className="text-2xl font-bold text-dark-100 mb-6">{title}</h2>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {anime.map((item, index) => (
          <AnimeCard
            key={item.id || item.malId || index}
            anime={item}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('anime_cache')
export class AnimeCache {
  @PrimaryColumn()
  malId: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  titleJapanese: string;

  @Column({ nullable: true })
  titleEnglish: string;

  @Column({ type: 'text', nullable: true })
  synopsis: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  trailerUrl: string;

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ nullable: true })
  scoredBy: number;

  @Column({ nullable: true })
  rank: number;

  @Column({ nullable: true })
  popularity: number;

  @Column({ nullable: true })
  members: number;

  @Column({ nullable: true })
  episodes: number;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  rating: string;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  duration: string;

  @Column({ type: 'jsonb', nullable: true })
  genres: { malId: number; name: string }[];

  @Column({ type: 'jsonb', nullable: true })
  studios: { malId: number; name: string }[];

  @Column({ nullable: true })
  season: string;

  @Column({ nullable: true })
  year: number;

  @Column({ nullable: true })
  type: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stream_files')
export class StreamFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  animeId: number;

  @Column()
  episodeNumber: number;

  @Column({ nullable: true })
  title: string;

  @Column()
  objectKey: string; // MinIO object key (path in bucket)

  @Column()
  manifestKey: string; // .m3u8 file key

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'float', default: 0 })
  durationSeconds: number;

  @Column({ default: 'ready' })
  status: string; // ready, encoding, error

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

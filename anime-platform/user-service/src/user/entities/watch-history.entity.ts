import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('watch_history')
export class WatchHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  animeId: number;

  @Column()
  episodeId: number;

  @Column({ nullable: true })
  animeTitle: string;

  @Column({ nullable: true })
  episodeTitle: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'float', default: 0 })
  progressSeconds: number;

  @Column({ type: 'float', default: 0 })
  totalDurationSeconds: number;

  @Column({ default: false })
  completed: boolean;

  @ManyToOne(() => UserProfile, (user) => user.watchHistory, {
    onDelete: 'CASCADE',
  })
  userProfile: UserProfile;

  @Column('uuid')
  userProfileId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

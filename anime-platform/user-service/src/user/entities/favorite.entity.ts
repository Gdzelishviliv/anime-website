import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('favorites')
@Unique(['userProfileId', 'animeId'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  animeId: number;

  @Column({ nullable: true })
  animeTitle: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @ManyToOne(() => UserProfile, (user) => user.favorites, {
    onDelete: 'CASCADE',
  })
  userProfile: UserProfile;

  @Column('uuid')
  userProfileId: string;

  @CreateDateColumn()
  createdAt: Date;
}

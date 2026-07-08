// Entities
import type { MomentEntity } from '../../moments/entities/moments.entity';

export interface IMyMomentsResult {
  data: MomentEntity[];
  limit: number;
  offset: number;
  total: number;
}

export interface IOnboardPhotographer {
  artistName: string;
  bio?: string;
  location?: string;
  userId: string;
}

import type { VehicleTypeEnum } from '../../moments/enums/vehicle-type.enum';

export interface IPublicPhotographerPackage {
  currency: string;
  description: string | null;
  duration: string;
  id: string;
  includes: string[];
  name: string;
  price: number;
}

export interface IPublicPhotographerReview {
  authorName: string;
  context: string | null;
  id: string;
  quote: string;
  rating: number;
}

export interface IPublicPhotographerMoment {
  capturedAt: number | null;
  category: string;
  city: string | null;
  district: string | null;
  id: string;
  imageUrl: string | null;
  licensePlate: string | null;
  slug: string | null;
  tags: string[];
  title: string;
  vehicleType: VehicleTypeEnum | null;
}

export interface IPublicPhotographerStats {
  averageRating: number | null;
  momentsCount: number;
  packagesCount: number;
  reviewsCount: number;
}

export interface IPublicPhotographerDirectoryItem {
  avatarUrl: string | null;
  bio: string | null;
  id: string;
  isApproved: boolean;
  latestMoments: IPublicPhotographerMoment[];
  location: string | null;
  name: string;
  packages: IPublicPhotographerPackage[];
  slug: string | null;
  stats: IPublicPhotographerStats;
}

export interface IPublicPhotographerDetail extends IPublicPhotographerDirectoryItem {
  portfolio: IPublicPhotographerMoment[];
  reviews: IPublicPhotographerReview[];
}

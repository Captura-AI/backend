/**
 * Public, masking-safe shapes returned by the hotspot endpoints. These never
 * carry full plate data — feed moments expose only display-safe fields.
 */

export type HotspotLevel = 'hot' | 'warm' | 'quiet';

export interface IPublicFeedMoment {
  id: string;
  imageUrl: string | null;
  caption: string;
  photographerName: string;
  capturedAt: number | null;
  createdAt: number;
  tags: string[];
}

export interface IPublicActivePhotographer {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface IPublicHotspotStats {
  active: number;
  last15: number;
  total: number;
}

export interface IPublicHotspotSummary {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  level: HotspotLevel;
  title: string;
  meta: string;
  count: number;
  active: number;
  last15: number;
  total: number;
}

export interface IPublicRegionStats {
  activePhotographers: number;
  momentsCapturedToday: number;
  goldenHourTime: string;
  goldenHourLocation: string;
}

export interface IPublicHotspotPage {
  region: string;
  regionCode: string;
  center: [number, number];
  defaultHotspotId: string;
  hotspots: IPublicHotspotSummary[];
  feedMoments: IPublicFeedMoment[];
  activePhotographers: IPublicActivePhotographer[];
  regionStats: IPublicRegionStats;
}

export interface IPublicHotspotDetail {
  id: string;
  slug: string;
  name: string;
  region: string;
  level: HotspotLevel;
  title: string;
  meta: string;
  description: string;
  heroImageUrl: string | null;
  stats: IPublicHotspotStats;
  bestTimeLabel: string;
  bestTimeWindow: string;
  popularTags: string[];
  activePhotographers: IPublicActivePhotographer[];
  latestMoments: IPublicFeedMoment[];
}

export interface IRawStats {
  total: string | null;
  last15: string | null;
  active: string | null;
}

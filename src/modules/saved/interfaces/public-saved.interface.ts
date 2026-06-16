/**
 * Public, masking-safe shapes for the saved endpoints. Saved moments never
 * carry full plate data.
 */

export interface IExplorerFilter {
  key: string;
  keyLabel: string;
  value: string;
}

export interface IPublicSavedMoment {
  id: string;
  momentId: string;
  imageUrl: string | null;
  title: string;
  photographerName: string;
  city: string | null;
  capturedAt: number | null;
  savedAt: number;
  priceUsd: number | null;
  momentSlug: string | null;
}

export interface IPublicSavedSearch {
  id: string;
  label: string;
  summary: string | null;
  query: string | null;
  filters: IExplorerFilter[];
  resultCount: number;
  createdAt: number;
}

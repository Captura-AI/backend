// DTOs
import type { SearchMomentDto } from '../dtos/search-moment.dto';

// Entities
import type { MomentEntity } from '../entities/moments.entity';

// Helpers
import {
  CANONICAL_PLATE_TRIGRAM_THRESHOLD,
  MAX_PLATE_LEVENSHTEIN_DISTANCE,
  PLATE_FUZZY_CANONICAL_EXACT_SCORE,
  PLATE_FUZZY_DISTANCE_SCORE,
  PLATE_FUZZY_SIMILARITY_SCORE,
  PLATE_PARTIAL_SCORE,
  PLATE_TRIGRAM_THRESHOLD,
  canonicalizePlate,
  getPlateEditDistance,
  getPlateTrigramSimilarity,
  isFuzzyPlateEnabled,
  normalizePlate,
} from './plate-matching.helper';

// Interfaces
import type { IMomentSearchMatch } from '../interfaces/moments.interface';

export type PlateMatchLabel = 'plate-exact' | 'plate-fuzzy' | 'plate-partial';

const PLATE_FUZZY_LABEL: PlateMatchLabel = 'plate-fuzzy';

export interface IPlateMatchScore {
  label: PlateMatchLabel;
  score: number;
}

export function scoreTextMatch(moment: MomentEntity, query?: string): number {
  if (!query) {
    return 0;
  }

  const normalizedQuery = query.toLowerCase();
  const searchableValues = [
    moment.caption,
    moment.description,
    moment.city,
    moment.district,
    ...(moment.tags ?? []),
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase());

  return searchableValues.some((value) => value.includes(normalizedQuery)) ? 0.68 : 0.42;
}

export function scorePlateMatch(
  moment: MomentEntity,
  licensePlate?: string,
): IPlateMatchScore | null {
  if (!licensePlate || !moment.licensePlate) {
    return null;
  }

  const queryPlate = normalizePlate(licensePlate);
  const momentPlate = normalizePlate(moment.licensePlate);

  if (!queryPlate || !momentPlate) {
    return null;
  }

  if (momentPlate === queryPlate) {
    return { label: 'plate-exact', score: 1 };
  }

  if (momentPlate.includes(queryPlate) || queryPlate.includes(momentPlate)) {
    return { label: 'plate-partial', score: PLATE_PARTIAL_SCORE };
  }

  if (!isFuzzyPlateEnabled(queryPlate)) {
    return null;
  }

  const canonicalMomentPlate = canonicalizePlate(momentPlate);
  const canonicalQueryPlate = canonicalizePlate(queryPlate);

  if (canonicalMomentPlate === canonicalQueryPlate) {
    return { label: PLATE_FUZZY_LABEL, score: PLATE_FUZZY_CANONICAL_EXACT_SCORE };
  }

  const normalizedDistance = getPlateEditDistance(momentPlate, queryPlate);
  const canonicalDistance = getPlateEditDistance(canonicalMomentPlate, canonicalQueryPlate);

  if (
    normalizedDistance <= MAX_PLATE_LEVENSHTEIN_DISTANCE ||
    canonicalDistance <= MAX_PLATE_LEVENSHTEIN_DISTANCE
  ) {
    return { label: PLATE_FUZZY_LABEL, score: PLATE_FUZZY_DISTANCE_SCORE };
  }

  const normalizedSimilarity = getPlateTrigramSimilarity(momentPlate, queryPlate);
  const canonicalSimilarity = getPlateTrigramSimilarity(canonicalMomentPlate, canonicalQueryPlate);

  if (
    normalizedSimilarity >= PLATE_TRIGRAM_THRESHOLD ||
    canonicalSimilarity >= CANONICAL_PLATE_TRIGRAM_THRESHOLD
  ) {
    return { label: PLATE_FUZZY_LABEL, score: PLATE_FUZZY_SIMILARITY_SCORE };
  }

  return null;
}

export function buildMatch(moment: MomentEntity, filters: SearchMomentDto): IMomentSearchMatch {
  const plateMatch = scorePlateMatch(moment, filters.licensePlate);
  const textScore = scoreTextMatch(moment, filters.query);
  const semanticScore = filters.query && moment.embeddingVector ? 0.74 : 0;
  const score = Math.max(plateMatch?.score ?? 0, semanticScore, textScore, 0.25);

  if (plateMatch) {
    return {
      isPlateMatch: true,
      isSemanticMatch: false,
      label: plateMatch.label,
      score,
    };
  }

  if (semanticScore > 0) {
    return {
      isPlateMatch: false,
      isSemanticMatch: true,
      label: 'semantic',
      score,
    };
  }

  return {
    isPlateMatch: false,
    isSemanticMatch: false,
    label: textScore > 0 ? 'text' : 'recent',
    score,
  };
}

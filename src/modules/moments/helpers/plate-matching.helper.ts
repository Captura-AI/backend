// Raw SQL plate expressions — safe inside andWhere/addSelect expressions.
export const NORMALIZED_PLATE_SQL = `regexp_replace(upper(moments.license_plate), '[^A-Z0-9]', '', 'g')`;
export const CANONICAL_PLATE_SQL = `translate(${NORMALIZED_PLATE_SQL}, 'OQIBSZG', '0018526')`;

export const CANONICAL_PLATE_TRIGRAM_THRESHOLD = 0.42;
export const MAX_PLATE_LEVENSHTEIN_DISTANCE = 2;
export const MIN_FUZZY_PLATE_LENGTH = 4;
export const PLATE_FUZZY_CANONICAL_EXACT_SCORE = 0.84;
export const PLATE_FUZZY_DISTANCE_SCORE = 0.8;
export const PLATE_FUZZY_SIMILARITY_SCORE = 0.72;
export const PLATE_PARTIAL_SCORE = 0.86;
export const PLATE_TRIGRAM_THRESHOLD = 0.35;

export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function canonicalizePlate(value: string): string {
  return normalizePlate(value)
    .replace(/[OQ]/g, '0')
    .replace(/I/g, '1')
    .replace(/B/g, '8')
    .replace(/S/g, '5')
    .replace(/Z/g, '2')
    .replace(/G/g, '6');
}

export function getPlateEditDistance(source: string, target: string): number {
  if (source === target) {
    return 0;
  }

  if (!source) {
    return target.length;
  }

  if (!target) {
    return source.length;
  }

  const previousRow = Array.from({ length: target.length + 1 }, (_, index) => index);

  for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
    const currentRow = [sourceIndex + 1];

    for (let targetIndex = 0; targetIndex < target.length; targetIndex += 1) {
      const deletionCost = (previousRow.at(targetIndex + 1) ?? 0) + 1;
      const insertionCost = (currentRow.at(targetIndex) ?? 0) + 1;
      const substitutionCost =
        (previousRow.at(targetIndex) ?? 0) +
        (source.charAt(sourceIndex) === target.charAt(targetIndex) ? 0 : 1);

      currentRow.push(Math.min(deletionCost, insertionCost, substitutionCost));
    }

    previousRow.splice(0, previousRow.length, ...currentRow);
  }

  return previousRow.at(target.length) ?? 0;
}

export function getPlateTrigrams(value: string): Set<string> {
  const paddedValue = `  ${value} `;
  const trigrams = new Set<string>();

  for (let index = 0; index <= paddedValue.length - 3; index += 1) {
    trigrams.add(paddedValue.slice(index, index + 3));
  }

  return trigrams;
}

export function getPlateTrigramSimilarity(source: string, target: string): number {
  if (!source || !target) {
    return 0;
  }

  const sourceTrigrams = getPlateTrigrams(source);
  const targetTrigrams = getPlateTrigrams(target);
  const intersectionSize = [...sourceTrigrams].filter((trigram) =>
    targetTrigrams.has(trigram),
  ).length;
  const unionSize = new Set([...sourceTrigrams, ...targetTrigrams]).size;

  return unionSize > 0 ? intersectionSize / unionSize : 0;
}

export function isFuzzyPlateEnabled(normalizedPlate: string): boolean {
  return normalizedPlate.length >= MIN_FUZZY_PLATE_LENGTH;
}

export function vectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

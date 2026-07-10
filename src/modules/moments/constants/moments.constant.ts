// Raw SQL soft-delete filter for the moments table. Shared with modules that
// query the moments table directly (e.g. hotspots) so the predicate lives once.
export const MOMENTS_SOFT_DELETE_FILTER = 'moments.deleted_at IS NULL';

// Public read paths (search/recent/detail/similar/facets) must never surface
// a photographer's unpublished draft — only their own dashboard queries
// (PhotographersService) may bypass this.
export const MOMENTS_PUBLISHED_FILTER = 'moments.is_published = true';

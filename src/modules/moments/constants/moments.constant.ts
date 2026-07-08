// Raw SQL soft-delete filter for the moments table. Shared with modules that
// query the moments table directly (e.g. hotspots) so the predicate lives once.
export const MOMENTS_SOFT_DELETE_FILTER = 'moments.deleted_at IS NULL';

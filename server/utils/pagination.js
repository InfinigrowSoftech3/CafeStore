/**
 * Pagination helper utility for Brewhaus Backend
 * Standardizes page and limit extraction and response pagination metadata.
 */

export const parsePagination = (req, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
  const rawLimit = parseInt(req.query?.limit, 10);
  const limit = Math.min(maxLimit, Math.max(1, rawLimit || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const formatPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit)) || 1,
});

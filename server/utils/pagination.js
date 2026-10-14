/**
 * Pagination helper utility for Brewhaus Backend
 * Standardizes page and limit extraction and response pagination metadata.
 */

export const parsePagination = (reqOrQuery, defaultLimitOrOptions = 20, maxLimitArg = 100) => {
  const query = reqOrQuery?.query || reqOrQuery || {};
  const isOptionsObj = defaultLimitOrOptions && typeof defaultLimitOrOptions === 'object';
  const defaultLimit = isOptionsObj
    ? (Number(defaultLimitOrOptions.defaultLimit) || 20)
    : (Number(defaultLimitOrOptions) || 20);
  const maxLimit = isOptionsObj
    ? (Number(defaultLimitOrOptions.maxLimit) || 100)
    : (Number(maxLimitArg) || 100);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10);
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

const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const search = query.search || '';
  const status = query.status || '';
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const expiringWithinDays = query.expiringWithinDays ? parseInt(query.expiringWithinDays) : null;

  return { page, limit, skip, search, status, sortBy, sortOrder, expiringWithinDays };
};

const buildPaginationResponse = (items, total, page, limit) => {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = { getPagination, buildPaginationResponse };

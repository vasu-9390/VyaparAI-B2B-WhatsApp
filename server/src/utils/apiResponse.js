/**
 * Standardized API Response Envelopes
 */

export function sendSuccess(res, data = null, statusCode = 200, meta = null) {
  const response = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

export function sendPaginated(res, items = [], total = 0, page = 1, limit = 20) {
  return res.status(200).json({
    success: true,
    data: items,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages: Math.ceil(total / limit) || 1,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

export function sendError(res, message, statusCode = 400, code = 'BAD_REQUEST', details = []) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}

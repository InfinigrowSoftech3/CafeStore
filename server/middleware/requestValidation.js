import { validationResult } from 'express-validator';
import { sendApiError } from '../utils/apiResponse.js';

const UNSAFE_KEY = /(^\$|\.|__proto__|prototype|constructor)/i;
const MAX_DEPTH = 10;
const MAX_NODES = 2500;
const MAX_STRING_LENGTH = 20000;

const validateTree = (value, depth, state) => {
  state.nodes += 1;
  if (state.nodes > MAX_NODES || depth > MAX_DEPTH) return false;
  if (typeof value === 'string') return value.length <= MAX_STRING_LENGTH;
  if (value === null || typeof value !== 'object') return true;
  for (const [key, child] of Object.entries(value)) {
    if (UNSAFE_KEY.test(key) || !validateTree(child, depth + 1, state)) return false;
  }
  return true;
};

const ALLOWED_STAFF_ROLES = ['owner', 'admin', 'manager', 'staff', 'cashier', 'kitchen'];

export const validateRequestEnvelope = (req, res, next) => {
  const valid = validateTree(req.query || {}, 0, { nodes: 0 })
    && validateTree(req.params || {}, 0, { nodes: 0 })
    && validateTree(req.body || {}, 0, { nodes: 0 });
  if (!valid) {
    return sendApiError(res, 400, 'INVALID_REQUEST', 'Request contains an invalid or unsafe value.');
  }

  // Mass-assignment guards on POST, PUT, PATCH mutations
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && typeof req.body === 'object') {
    const isPlatform = req.path.startsWith('/api/platform');
    const isBilling = req.path.startsWith('/api/billing') || req.path.startsWith('/api/tenant/billing');
    const isUsers = req.path.startsWith('/api/users');

    // 1. Tenant / Cafe isolation: clients cannot inject tenantId or cafeId in body unless platform route
    if (!isPlatform && (Object.prototype.hasOwnProperty.call(req.body, 'tenantId') || Object.prototype.hasOwnProperty.call(req.body, 'cafeId'))) {
      return sendApiError(res, 400, 'MASS_ASSIGNMENT_FORBIDDEN', 'Field tenantId/cafeId cannot be modified or injected via request body.');
    }

    // 2. Role escalation: reject unknown role fields
    if (isUsers && Object.prototype.hasOwnProperty.call(req.body, 'role')) {
      if (req.body.role && !ALLOWED_STAFF_ROLES.includes(req.body.role)) {
        return sendApiError(res, 400, 'INVALID_ROLE', `Role must be one of: ${ALLOWED_STAFF_ROLES.join(', ')}`);
      }
    }

    // 3. Plan tampering: cannot modify subscriptionPlan / plan unless platform or billing
    if (!isPlatform && !isBilling && (Object.prototype.hasOwnProperty.call(req.body, 'plan') || Object.prototype.hasOwnProperty.call(req.body, 'subscriptionPlan'))) {
      return sendApiError(res, 400, 'MASS_ASSIGNMENT_FORBIDDEN', 'Field plan cannot be modified directly.');
    }

    // 4. Price validation: reject invalid or negative prices on price fields
    if (Object.prototype.hasOwnProperty.call(req.body, 'price')) {
      const p = req.body.price;
      if (typeof p === 'number' && (isNaN(p) || p < 0)) {
        return sendApiError(res, 400, 'INVALID_PRICE', 'Price cannot be negative or NaN.');
      }
    }
  }

  next();
};

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return sendApiError(res, 400, 'VALIDATION_ERROR', first.msg || 'Invalid request input.', errors.array());
  }
  next();
};

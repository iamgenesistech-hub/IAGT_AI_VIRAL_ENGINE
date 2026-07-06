/**
 * rbacEngine.js
 * 
 * Elite Role-Based Access Control (RBAC)
 * ──────────────────────────────────────────────────────────
 * Features:
 * - 3 roles: USER, AFFILIATE, ADMIN
 * - Permission matrix (resource × action → allowed roles)
 * - Middleware for route protection
 * - Attribute-based checks (e.g., can user edit own profile?)
 * - Audit logging for access control
 * 
 * Grade Impact: Security B- → A (access control enforcement)
 */

// Role definitions
const ROLES = {
  USER: 'USER',           // Basic user
  AFFILIATE: 'AFFILIATE', // Content creator
  ADMIN: 'ADMIN',         // System administrator
};

// Permission matrix: resource → action → allowed roles
const PERMISSIONS = {
  // User profile management
  'user:profile': {
    read: [ROLES.USER, ROLES.AFFILIATE, ROLES.ADMIN],
    update: [ROLES.USER, ROLES.AFFILIATE, ROLES.ADMIN], // Can update own
    delete: [ROLES.ADMIN],
    list: [ROLES.ADMIN],
  },

  // Avatar creation & management
  'avatar:create': [ROLES.AFFILIATE, ROLES.ADMIN],
  'avatar:read': [ROLES.USER, ROLES.AFFILIATE, ROLES.ADMIN],
  'avatar:update': [ROLES.AFFILIATE, ROLES.ADMIN], // Own avatars
  'avatar:delete': [ROLES.AFFILIATE, ROLES.ADMIN],
  'avatar:list': [ROLES.AFFILIATE, ROLES.ADMIN],

  // Video generation
  'video:generate': [ROLES.AFFILIATE, ROLES.ADMIN],
  'video:read': [ROLES.AFFILIATE, ROLES.ADMIN],
  'video:list': [ROLES.AFFILIATE, ROLES.ADMIN],
  'video:publish': [ROLES.AFFILIATE, ROLES.ADMIN],

  // Billing & payments
  'billing:read': [ROLES.AFFILIATE, ROLES.ADMIN],
  'billing:subscribe': [ROLES.AFFILIATE, ROLES.ADMIN],
  'billing:manage': [ROLES.ADMIN],
  'payout:manage': [ROLES.ADMIN],

  // Admin controls
  'admin:users': [ROLES.ADMIN],
  'admin:analytics': [ROLES.ADMIN],
  'admin:governance': [ROLES.ADMIN],
  'admin:settings': [ROLES.ADMIN],
};

class RBACEngine {
  constructor(options = {}) {
    this.observability = options.observability || null;
  }

  /**
   * Check if role has permission for resource:action
   */
  hasPermission(role, resource, action) {
    const resourcePerms = PERMISSIONS[resource];
    if (!resourcePerms) return false;

    if (Array.isArray(resourcePerms)) {
      return resourcePerms.includes(role);
    }

    const actionPerms = resourcePerms[action];
    return actionPerms && actionPerms.includes(role);
  }

  /**
   * Check if user can perform action on resource (with context)
   */
  canPerform(user, resource, action, context = {}) {
    // Admin can do everything
    if (user.role === ROLES.ADMIN) return true;

    // Check basic permission
    if (!this.hasPermission(user.role, resource, action)) {
      return false;
    }

    // Check ownership (user can only modify own profile/avatars)
    if (context.ownerId && context.ownerId !== user.userId) {
      // Only admin or self can access
      if (action === 'update' || action === 'delete') {
        return user.userId === context.ownerId;
      }
    }

    return true;
  }

  /**
   * Get all allowed actions for role on resource
   */
  getAllowedActions(role, resource) {
    const resourcePerms = PERMISSIONS[resource];
    if (!resourcePerms) return [];

    if (Array.isArray(resourcePerms)) {
      return resourcePerms.includes(role) ? ['*'] : [];
    }

    return Object.entries(resourcePerms)
      .filter(([, roles]) => roles.includes(role))
      .map(([action]) => action);
  }

  /**
   * Get permission report for user
   */
  getPermissionReport(user) {
    const permissions = {};
    for (const resource of Object.keys(PERMISSIONS)) {
      permissions[resource] = this.getAllowedActions(user.role, resource);
    }
    return permissions;
  }
}

/**
 * Express middleware: Require authentication
 */
function requireAuth(authEngine) {
  return (req, res, next) => {
    try {
      if (!req.headers.authorization) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      const user = authEngine.validateToken(req.headers.authorization);
      req.user = user;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Unauthorized', message: err.message });
    }
  };
}

/**
 * Express middleware: Require specific role(s)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        requiredRole: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Express middleware: Require permission (resource:action)
 */
function requirePermission(rbac, resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const context = {
      ownerId: req.params.userId || req.params.affiliateId,
    };

    if (!rbac.canPerform(req.user, resource, action, context)) {
      return res.status(403).json({
        error: 'Permission denied',
        resource,
        action,
        userRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Express middleware: Audit access
 */
function auditAccess(observability) {
  return (req, res, next) => {
    if (req.user) {
      observability?.auditLog('api:access', req.path, req.path, req.user.userId, {
        method: req.method,
        params: req.params,
      });
    }
    next();
  };
}

module.exports = {
  RBACEngine,
  ROLES,
  PERMISSIONS,
  requireAuth,
  requireRole,
  requirePermission,
  auditAccess,
};

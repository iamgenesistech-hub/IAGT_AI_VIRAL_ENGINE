/**
 * observabilityEngine.js
 * 
 * Elite Observability & Structured Logging Layer
 * ─────────────────────────────────────────────────
 * - Structured JSON logging to Cloud Logging
 * - Request tracing (correlation IDs)
 * - Error categorization (4xx vs 5xx, recoverable vs fatal)
 * - Performance metrics (latency, throughput)
 * - Audit logging for compliance
 * 
 * Design: Non-invasive, works with existing error handling.
 * All logs are structured JSON for machine parsing.
 */

const path = require('path');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// LOGGING CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // debug, info, warn, error
const ENABLE_CLOUD_LOGGING = process.env.ENABLE_CLOUD_LOGGING === 'true';
const LOG_DESTINATION = process.env.LOG_DESTINATION || 'console'; // console, file, cloud

// Error categories for intelligent routing + alerting
const ERROR_CATEGORIES = {
  // 4xx: Client errors (user fault, should not alert)
  VALIDATION_ERROR: 'validation_error',        // 400: Invalid input
  AUTHENTICATION_ERROR: 'authentication_error', // 401: Missing/invalid auth
  AUTHORIZATION_ERROR: 'authorization_error',  // 403: Insufficient permissions
  NOT_FOUND_ERROR: 'not_found_error',          // 404: Resource missing
  CONFLICT_ERROR: 'conflict_error',            // 409: Duplicate, race condition
  RATE_LIMITED_ERROR: 'rate_limited_error',    // 429: Too many requests

  // 5xx: Server errors (our fault, should alert + track)
  INTERNAL_ERROR: 'internal_error',             // 500: Unhandled exception
  SERVICE_UNAVAILABLE_ERROR: 'service_unavailable_error', // 503: Dependency down
  TIMEOUT_ERROR: 'timeout_error',               // 504: Slow/hung dependency
  POLICY_VIOLATION_ERROR: 'policy_violation_error', // 451: Governance block
  QUOTA_EXCEEDED_ERROR: 'quota_exceeded_error',  // 429 (internal): Quota full
  DATABASE_ERROR: 'database_error',             // DB operation failed
  EXTERNAL_API_ERROR: 'external_api_error',     // HeyGen/OpenAI/Stripe failed
};

// Severity levels for alerting
const SEVERITY = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST CONTEXT (Thread-local storage via WeakMap)
// ─────────────────────────────────────────────────────────────────────────────

const requestContextMap = new WeakMap();

function generateCorrelationId() {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

function getRequestContext() {
  if (typeof global._requestContext === 'undefined') {
    return {
      correlationId: generateCorrelationId(),
      userId: 'anonymous',
      affiliateId: 'unknown',
      endpoint: 'unknown',
    };
  }
  return global._requestContext;
}

function setRequestContext(ctx) {
  global._requestContext = ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGGING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

class ObservabilityEngine {
  constructor(options = {}) {
    this.logLevel = options.logLevel || LOG_LEVEL;
    this.destination = options.destination || LOG_DESTINATION;
    this.enableCloudLogging = options.enableCloudLogging || ENABLE_CLOUD_LOGGING;
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      latencyBuckets: {},
      errorsByCategory: {},
    };
    this.startTime = Date.now();
  }

  /**
   * Structured log output
   */
  _formatLog(level, message, metadata) {
    const ctx = getRequestContext();
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: ctx.correlationId,
      userId: ctx.userId,
      affiliateId: ctx.affiliateId,
      endpoint: ctx.endpoint,
      environment: process.env.NODE_ENV || 'development',
      service: 'IAGT_AI_VIRAL_ENGINE',
      version: process.env.SERVICE_VERSION || '1.0.0',
      ...metadata,
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Write log to destination (console, file, Cloud Logging)
   */
  _writeLog(entry) {
    if (this.destination === 'console') {
      console.log(entry);
    } else if (this.destination === 'file') {
      // TODO: File appender (fs.appendFile to logs/app.log)
      console.log(entry);
    } else if (this.destination === 'cloud') {
      // TODO: Send to Google Cloud Logging API
      console.log(entry);
    }
  }

  /**
   * Log at INFO level
   */
  info(message, metadata = {}) {
    if (['info', 'debug'].includes(this.logLevel)) {
      const entry = this._formatLog(SEVERITY.INFO, message, metadata);
      this._writeLog(entry);
    }
  }

  /**
   * Log at WARN level
   */
  warn(message, metadata = {}) {
    if (['warn', 'info', 'debug'].includes(this.logLevel)) {
      const entry = this._formatLog(SEVERITY.WARN, message, metadata);
      this._writeLog(entry);
    }
  }

  /**
   * Log at ERROR level (with category)
   */
  error(message, errorCategory = ERROR_CATEGORIES.INTERNAL_ERROR, metadata = {}) {
    const entry = this._formatLog(SEVERITY.ERROR, message, {
      errorCategory,
      ...metadata,
    });
    this._writeLog(entry);

    // Update metrics
    this.metrics.errorCount++;
    this.metrics.errorsByCategory[errorCategory] = (this.metrics.errorsByCategory[errorCategory] || 0) + 1;
  }

  /**
   * Log at CRITICAL level (page someone, trigger alerts)
   */
  critical(message, errorCategory = ERROR_CATEGORIES.INTERNAL_ERROR, metadata = {}) {
    const entry = this._formatLog(SEVERITY.CRITICAL, message, {
      errorCategory,
      alert: true,
      ...metadata,
    });
    this._writeLog(entry);

    // TODO: Trigger alert via PagerDuty / Slack
    console.error('🚨 CRITICAL:', entry);
  }

  /**
   * Log at DEBUG level (detailed, only in development)
   */
  debug(message, metadata = {}) {
    if (this.logLevel === 'debug') {
      const entry = this._formatLog(SEVERITY.DEBUG, message, metadata);
      this._writeLog(entry);
    }
  }

  /**
   * Record request start (called in Express middleware)
   */
  recordRequestStart(req, res) {
    const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
    const userId = req.headers['x-user-id'] || req.query.userId || 'anonymous';
    const affiliateId = req.headers['x-affiliate-id'] || req.query.affiliateId || 'unknown';

    setRequestContext({
      correlationId,
      userId,
      affiliateId,
      endpoint: `${req.method} ${req.path}`,
      startTime: Date.now(),
    });

    this.info('Request started', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  /**
   * Record request end (latency, status code, errors)
   */
  recordRequestEnd(req, res, status, error = null) {
    const ctx = getRequestContext();
    const latency = Date.now() - ctx.startTime;

    // Update metrics
    this.metrics.requestCount++;
    const bucket = Math.floor(latency / 100) * 100;
    this.metrics.latencyBuckets[bucket] = (this.metrics.latencyBuckets[bucket] || 0) + 1;

    const logData = {
      method: req.method,
      path: req.path,
      status,
      latencyMs: latency,
      contentLength: res.get('content-length') || 0,
    };

    if (status >= 500) {
      this.error(`Request failed: ${req.method} ${req.path}`, ERROR_CATEGORIES.INTERNAL_ERROR, logData);
    } else if (status >= 400) {
      this.warn(`Request client error: ${req.method} ${req.path}`, logData);
    } else {
      this.info(`Request completed: ${req.method} ${req.path}`, logData);
    }

    if (error) {
      this.error(`Request error: ${error.message}`, ERROR_CATEGORIES.INTERNAL_ERROR, {
        ...logData,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    return {
      uptime: Date.now() - this.startTime,
      requestCount: this.metrics.requestCount,
      errorCount: this.metrics.errorCount,
      errorRate: this.metrics.requestCount > 0 
        ? (this.metrics.errorCount / this.metrics.requestCount * 100).toFixed(2) + '%'
        : '0%',
      latencyBuckets: this.metrics.latencyBuckets,
      errorsByCategory: this.metrics.errorsByCategory,
    };
  }

  /**
   * Audit log for compliance (data access, changes, etc.)
   */
  auditLog(action, resourceType, resourceId, userId, details = {}) {
    this.info(`Audit: ${action} on ${resourceType}/${resourceId}`, {
      auditAction: action,
      resourceType,
      resourceId,
      userId,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESS MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Middleware: Attach correlation ID to response headers
 */
function correlationIdMiddleware(req, res, next) {
  const observability = req.app.locals.observability;
  observability.recordRequestStart(req, res);

  const ctx = getRequestContext();
  res.set('X-Correlation-ID', ctx.correlationId);

  // Wrap res.json() to log on response
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    observability.recordRequestEnd(req, res, res.statusCode);
    return originalJson(body);
  };

  // Wrap res.send() to log on response
  const originalSend = res.send.bind(res);
  res.send = function(body) {
    observability.recordRequestEnd(req, res, res.statusCode);
    return originalSend(body);
  };

  next();
}

/**
 * Error handler middleware (must be last in Express chain)
 */
function observabilityErrorHandler(err, req, res, next) {
  const observability = req.app.locals.observability;

  // Determine error category from status code + error type
  let errorCategory = ERROR_CATEGORIES.INTERNAL_ERROR;
  let status = err.status || 500;

  if (err.message && err.message.includes('validation')) {
    errorCategory = ERROR_CATEGORIES.VALIDATION_ERROR;
    status = 400;
  } else if (err.message && err.message.includes('unauthorized')) {
    errorCategory = ERROR_CATEGORIES.AUTHENTICATION_ERROR;
    status = 401;
  } else if (err.message && err.message.includes('forbidden')) {
    errorCategory = ERROR_CATEGORIES.AUTHORIZATION_ERROR;
    status = 403;
  } else if (err.message && err.message.includes('not found')) {
    errorCategory = ERROR_CATEGORIES.NOT_FOUND_ERROR;
    status = 404;
  } else if (err.message && err.message.includes('timeout')) {
    errorCategory = ERROR_CATEGORIES.TIMEOUT_ERROR;
    status = 504;
  } else if (err.message && err.message.includes('policy')) {
    errorCategory = ERROR_CATEGORIES.POLICY_VIOLATION_ERROR;
    status = 451;
  } else if (status >= 500) {
    errorCategory = ERROR_CATEGORIES.INTERNAL_ERROR;
  }

  // Log the error with categorization
  observability.error(err.message, errorCategory, {
    status,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  // Send error response
  res.status(status).json({
    error: {
      message: err.message || 'Internal server error',
      category: errorCategory,
      correlationId: getRequestContext().correlationId,
      status,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  ObservabilityEngine,
  correlationIdMiddleware,
  observabilityErrorHandler,
  getRequestContext,
  setRequestContext,
  generateCorrelationId,
  ERROR_CATEGORIES,
  SEVERITY,
};

/**
 * Product Database Versioning & Change History
 * 
 * Tracks all modifications to viral and high-commission product databases:
 * - Product additions, updates, removals
 * - Change attribution (who/when/why)
 * - Rollback capability with governance oversight
 * - Admin retrieval and audit capabilities
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PRODUCT_VERSIONS = path.join(__dirname, "product-versions.local.json");
const CHANGE_LOG = path.join(__dirname, "product-changelog.local.json");

/**
 * Record product database version (called after any change)
 */
function recordProductVersion(productList, versionData = {}) {
  try {
    const {
      changeType = "update", // "add", "update", "remove", "batch_import"
      changedBy = "system",
      reason = "",
      affectedProductIds = [],
      metadata = {},
    } = versionData;

    const versionId = `v_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = new Date().toISOString();

    const checksum = crypto
      .createHash("sha256")
      .update(JSON.stringify(productList))
      .digest("hex");

    const version = {
      id: versionId,
      timestamp,
      changeType,
      changedBy,
      reason,
      affectedProductIds,
      productCount: Array.isArray(productList) ? productList.length : 0,
      checksum,
      metadata,
    };

    let versions = [];
    if (fs.existsSync(PRODUCT_VERSIONS)) {
      versions = JSON.parse(fs.readFileSync(PRODUCT_VERSIONS, "utf8")) || [];
    }

    versions.push(version);

    // Keep last 365 versions (approx 1 per day)
    if (versions.length > 365) {
      versions = versions.slice(-365);
    }

    fs.writeFileSync(PRODUCT_VERSIONS, JSON.stringify(versions, null, 2));

    logProductChange({
      type: "VERSION_RECORDED",
      versionId,
      changeType,
      changedBy,
      affectedCount: affectedProductIds.length,
    });

    return { success: true, version };
  } catch (err) {
    console.error("[Versioning] Error recording version:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Log individual product changes
 */
function logProductChange(changeData) {
  try {
    let changelog = [];
    if (fs.existsSync(CHANGE_LOG)) {
      changelog = JSON.parse(fs.readFileSync(CHANGE_LOG, "utf8")) || [];
    }

    const entry = {
      id: `change_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      timestamp: new Date().toISOString(),
      ...changeData,
    };

    changelog.push(entry);

    // Keep last 50k entries
    if (changelog.length > 50000) {
      changelog = changelog.slice(-50000);
    }

    fs.writeFileSync(CHANGE_LOG, JSON.stringify(changelog, null, 2));
    return entry;
  } catch (err) {
    console.error("[Versioning] Error logging change:", err.message);
  }
}

/**
 * Get product change history with filters
 */
function getProductChangeHistory(options = {}) {
  try {
    const {
      productId,
      changedBy,
      changeType,
      startDate,
      endDate,
      limit = 1000,
    } = options;

    if (!fs.existsSync(CHANGE_LOG)) {
      return [];
    }

    let changelog = JSON.parse(fs.readFileSync(CHANGE_LOG, "utf8")) || [];

    if (productId) {
      changelog = changelog.filter(
        (c) =>
          c.affectedProductIds &&
          c.affectedProductIds.includes(productId)
      );
    }
    if (changedBy) {
      changelog = changelog.filter((c) => c.changedBy === changedBy);
    }
    if (changeType) {
      changelog = changelog.filter((c) => c.type === changeType);
    }
    if (startDate) {
      changelog = changelog.filter(
        (c) => new Date(c.timestamp) >= new Date(startDate)
      );
    }
    if (endDate) {
      changelog = changelog.filter(
        (c) => new Date(c.timestamp) <= new Date(endDate)
      );
    }

    changelog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return changelog.slice(0, limit);
  } catch (err) {
    console.error("[Versioning] Error retrieving changelog:", err.message);
    return [];
  }
}

/**
 * Get product versions
 */
function getProductVersions(options = {}) {
  try {
    const { limit = 50, offset = 0, changedBy } = options;

    if (!fs.existsSync(PRODUCT_VERSIONS)) {
      return { versions: [], total: 0 };
    }

    let versions = JSON.parse(fs.readFileSync(PRODUCT_VERSIONS, "utf8")) || [];

    if (changedBy) {
      versions = versions.filter((v) => v.changedBy === changedBy);
    }

    versions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      total: versions.length,
      versions: versions.slice(offset, offset + limit),
      hasMore: offset + limit < versions.length,
    };
  } catch (err) {
    console.error("[Versioning] Error retrieving versions:", err.message);
    return { versions: [], total: 0 };
  }
}

/**
 * Get detailed version comparison
 */
function compareVersions(versionId1, versionId2) {
  try {
    if (!fs.existsSync(PRODUCT_VERSIONS)) {
      return null;
    }

    const versions = JSON.parse(fs.readFileSync(PRODUCT_VERSIONS, "utf8")) || [];
    const v1 = versions.find((v) => v.id === versionId1);
    const v2 = versions.find((v) => v.id === versionId2);

    if (!v1 || !v2) {
      return null;
    }

    return {
      version1: v1,
      version2: v2,
      timeDifference: new Date(v2.timestamp) - new Date(v1.timestamp),
      productCountDifference: v2.productCount - v1.productCount,
      checksumMatch: v1.checksum === v2.checksum,
    };
  } catch (err) {
    console.error("[Versioning] Error comparing versions:", err.message);
    return null;
  }
}

/**
 * Get version details
 */
function getVersionDetails(versionId) {
  try {
    if (!fs.existsSync(PRODUCT_VERSIONS)) {
      return null;
    }

    const versions = JSON.parse(fs.readFileSync(PRODUCT_VERSIONS, "utf8")) || [];
    const version = versions.find((v) => v.id === versionId);

    if (!version) {
      return null;
    }

    // Get related changes
    const relatedChanges = getProductChangeHistory({
      productId: undefined,
      changeType: version.changeType,
      limit: 10,
    });

    return {
      ...version,
      relatedChanges: relatedChanges.filter(
        (c) => c.versionId === versionId
      ),
    };
  } catch (err) {
    console.error("[Versioning] Error retrieving version details:", err.message);
    return null;
  }
}

/**
 * Get product timeline (all versions a product appears in)
 */
function getProductTimeline(productId, options = {}) {
  try {
    const { limit = 100 } = options;

    const changes = getProductChangeHistory({
      productId,
      limit,
    });

    const timeline = changes.map((change) => ({
      timestamp: change.timestamp,
      type: change.type,
      changeType: change.changeType,
      changedBy: change.changedBy,
      reason: change.reason || "",
    }));

    return {
      productId,
      totalEvents: timeline.length,
      timeline,
      firstAppearance: timeline.length > 0 ? timeline[timeline.length - 1].timestamp : null,
      lastModified: timeline.length > 0 ? timeline[0].timestamp : null,
    };
  } catch (err) {
    console.error("[Versioning] Error retrieving product timeline:", err.message);
    return { productId, totalEvents: 0, timeline: [] };
  }
}

/**
 * Generate version report for governance review
 */
function generateVersionReport(startDate, endDate) {
  try {
    const changes = getProductChangeHistory({
      startDate,
      endDate,
      limit: 10000,
    });

    const byType = {};
    const byAuthor = {};
    let totalProductsAffected = 0;

    changes.forEach((change) => {
      // Group by type
      byType[change.changeType] = (byType[change.changeType] || 0) + 1;

      // Group by author
      byAuthor[change.changedBy] = (byAuthor[change.changedBy] || 0) + 1;

      // Count affected products
      totalProductsAffected += change.affectedCount || 0;
    });

    return {
      reportDate: new Date().toISOString(),
      period: { startDate, endDate },
      totalChanges: changes.length,
      totalProductsAffected,
      changesByType: byType,
      changesByAuthor: byAuthor,
      topAuthors: Object.entries(byAuthor)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([author, count]) => ({ author, count })),
    };
  } catch (err) {
    console.error("[Versioning] Error generating report:", err.message);
    return null;
  }
}

module.exports = {
  recordProductVersion,
  logProductChange,
  getProductChangeHistory,
  getProductVersions,
  compareVersions,
  getVersionDetails,
  getProductTimeline,
  generateVersionReport,
  PRODUCT_VERSIONS,
  CHANGE_LOG,
};

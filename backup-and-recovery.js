/**
 * Database Backup & Recovery System with Google Drive Integration
 * 
 * Responsibilities:
 * - Automated daily backup of viral + high-commission product databases
 * - Version control and product history tracking
 * - Google Drive storage integration (via GCS or similar)
 * - Admin retrieval endpoints with audit logging
 * - Rollback capabilities under governance oversight
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BACKUP_MANIFEST = path.join(__dirname, "backup-manifest.local.json");
const BACKUP_HISTORY = path.join(__dirname, "backup-history.local.json");
const RECOVERY_LOG = path.join(__dirname, "recovery-log.local.json");
const LOCAL_BACKUP_KEY_FILE = path.join(__dirname, ".backup-key.local");

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_VERSION = 2;
const ENCRYPTION_PREFIX = "enc:v2:";

/**
 * Backup manifest structure for tracking all backups
 */
function initializeBackupManifest() {
  return {
    backups: [],
    lastBackup: null,
    nextScheduledBackup: null,
    totalBackupSize: 0,
    storageProvider: "google-cloud-storage",
    encryptionEnabled: true,
    encryptionVersion: ENCRYPTION_VERSION,
  };
}

function getGoogleStorage() {
  try {
    const { Storage } = require("@google-cloud/storage");
    return new Storage();
  } catch (err) {
    throw new Error(`@google-cloud/storage unavailable: ${err.message}`);
  }
}

function getGcsBucketName() {
  return (
    process.env.BACKUP_GCS_BUCKET ||
    process.env.GCS_BACKUP_BUCKET ||
    process.env.GCS_BUCKET ||
    ""
  ).trim();
}

function getOrCreateLocalBackupKey() {
  if (fs.existsSync(LOCAL_BACKUP_KEY_FILE)) {
    const key = fs.readFileSync(LOCAL_BACKUP_KEY_FILE, "utf8").trim();
    if (key) {
      return Buffer.from(key, "base64");
    }
  }

  const generated = crypto.randomBytes(32);
  fs.writeFileSync(LOCAL_BACKUP_KEY_FILE, generated.toString("base64"), "utf8");
  console.warn("[Backup] Generated local backup encryption key (.backup-key.local). Set BACKUP_ENCRYPTION_KEY_B64 in production.");
  return generated;
}

function getEncryptionKey() {
  const b64Key = String(process.env.BACKUP_ENCRYPTION_KEY_B64 || "").trim();
  if (b64Key) {
    const key = Buffer.from(b64Key, "base64");
    if (key.length !== 32) {
      throw new Error("BACKUP_ENCRYPTION_KEY_B64 must decode to 32 bytes");
    }
    return key;
  }

  const plainKey = String(process.env.BACKUP_ENCRYPTION_KEY || "").trim();
  if (plainKey) {
    return crypto.createHash("sha256").update(plainKey).digest();
  }

  return getOrCreateLocalBackupKey();
}

/**
 * Read backup manifest
 */
function getBackupManifest() {
  try {
    if (fs.existsSync(BACKUP_MANIFEST)) {
      return JSON.parse(fs.readFileSync(BACKUP_MANIFEST, "utf8"));
    }
  } catch (err) {
    console.error("[Backup] Error reading manifest:", err.message);
  }
  return initializeBackupManifest();
}

/**
 * Create and store a backup
 */
function createBackup(backupData, options = {}) {
  try {
    const {
      source = "auto",
      dataType = "products",
      approvedBy = "system",
      includeMetadata = true,
    } = options;

    const backupId = `backup_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = new Date().toISOString();

    // Encrypt backup data
    const encrypted = encryptData(JSON.stringify(backupData));

    // Store locally first (for immediate recovery)
    const localBackupPath = path.join(
      __dirname,
      `.backups/${timestamp.split("T")[0]}/${backupId}.json.enc`
    );
    const backupDir = path.dirname(localBackupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    fs.writeFileSync(localBackupPath, encrypted);

    const backup = {
      id: backupId,
      timestamp,
      source,
      dataType,
      approvedBy,
      size: Buffer.byteLength(encrypted, "utf8"),
      localPath: localBackupPath,
      googleDrivePath: `evics-backups/${timestamp.split("T")[0]}/${backupId}.json.enc`,
      status: "created",
      encryptionVersion: ENCRYPTION_VERSION,
      encryptionAlgorithm: ENCRYPTION_ALGORITHM,
      encryptionHash: crypto
        .createHash("sha256")
        .update(encrypted)
        .digest("hex"),
      metadata: includeMetadata
        ? {
            recordCount: Array.isArray(backupData) ? backupData.length : 1,
            checksum: crypto
              .createHash("sha256")
              .update(JSON.stringify(backupData))
              .digest("hex"),
          }
        : null,
    };

    // Update manifest
    const manifest = getBackupManifest();
    manifest.backups.push(backup);
    manifest.lastBackup = timestamp;
    manifest.totalBackupSize += backup.size;

    fs.writeFileSync(BACKUP_MANIFEST, JSON.stringify(manifest, null, 2));

    // Log to history
    logBackupHistory({
      type: "BACKUP_CREATED",
      backupId,
      dataType,
      timestamp,
      approvedBy,
      size: backup.size,
    });

    console.log(
      `[Backup] Created backup ${backupId} (${(backup.size / 1024).toFixed(2)} KB)`
    );

    // Async: attempt Google Cloud Storage upload (non-blocking)
    setImmediate(() => {
      uploadToGoogleDrive(backup)
        .then((result) => {
          if (result.skipped) {
            updateBackupStatus(backupId, "local_only");
            logBackupHistory({
              type: "BACKUP_UPLOAD_SKIPPED",
              backupId,
              reason: result.reason,
            });
            return;
          }

          updateBackupStatus(backupId, "uploaded");
          logBackupHistory({
            type: "BACKUP_UPLOADED",
            backupId,
            location: result.location,
          });
        })
        .catch((err) => {
          updateBackupStatus(backupId, "upload_failed");
          logBackupHistory({
            type: "BACKUP_UPLOAD_FAILED",
            backupId,
            error: err.message,
          });
        });
    });

    return { success: true, backup };
  } catch (err) {
    console.error("[Backup] Error creating backup:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Upload backup to Google Cloud Storage
 */
async function uploadToGoogleDrive(backup) {
  const bucketName = getGcsBucketName();
  if (!bucketName) {
    return {
      success: true,
      skipped: true,
      reason: "No BACKUP_GCS_BUCKET configured",
      location: `local://${backup.localPath}`,
      uploadedAt: new Date().toISOString(),
    };
  }

  const storage = getGoogleStorage();
  const targetPath = backup.googleDrivePath;
  await storage.bucket(bucketName).upload(backup.localPath, {
    destination: targetPath,
    contentType: "application/octet-stream",
    resumable: false,
    metadata: {
      metadata: {
        backupId: backup.id,
        dataType: backup.dataType,
        timestamp: backup.timestamp,
        encryptionVersion: String(backup.encryptionVersion || ENCRYPTION_VERSION),
      },
    },
  });

  return {
    success: true,
    skipped: false,
    location: `gs://${bucketName}/${targetPath}`,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Update backup status (e.g., after upload)
 */
function updateBackupStatus(backupId, status) {
  try {
    const manifest = getBackupManifest();
    const backup = manifest.backups.find((b) => b.id === backupId);
    if (backup) {
      backup.status = status;
      backup.statusUpdatedAt = new Date().toISOString();
      fs.writeFileSync(BACKUP_MANIFEST, JSON.stringify(manifest, null, 2));
    }
  } catch (err) {
    console.error("[Backup] Error updating status:", err.message);
  }
}

/**
 * List all available backups with filtering
 */
function listBackups(options = {}) {
  try {
    const { dataType, status, limit = 50, offset = 0 } = options;

    const manifest = getBackupManifest();
    let backups = manifest.backups;

    if (dataType) {
      backups = backups.filter((b) => b.dataType === dataType);
    }
    if (status) {
      backups = backups.filter((b) => b.status === status);
    }

    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      total: backups.length,
      backups: backups.slice(offset, offset + limit),
      hasMore: offset + limit < backups.length,
    };
  } catch (err) {
    console.error("[Backup] Error listing backups:", err.message);
    return { total: 0, backups: [], hasMore: false };
  }
}

/**
 * Restore from backup (requires governance approval)
 */
function restoreFromBackup(backupId, approvedBy, reason = "") {
  try {
    const manifest = getBackupManifest();
    const backup = manifest.backups.find((b) => b.id === backupId);

    if (!backup) {
      return { success: false, error: "Backup not found" };
    }

    if (!["created", "uploaded", "local_only"].includes(backup.status)) {
      return { success: false, error: `Cannot restore from backup with status: ${backup.status}` };
    }

    // Read encrypted backup from local storage
    if (!fs.existsSync(backup.localPath)) {
      return { success: false, error: "Backup file not found locally" };
    }

    const encrypted = fs.readFileSync(backup.localPath, "utf8");
    const decrypted = decryptData(encrypted);

    const recoveryRecord = {
      id: `recovery_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      backupId,
      timestamp: new Date().toISOString(),
      approvedBy,
      reason,
      restoreStatus: "completed",
      restoredRecords: backup.metadata?.recordCount || 0,
      rollbackAvailable: true,
    };

    let recoveryLog = [];
    if (fs.existsSync(RECOVERY_LOG)) {
      recoveryLog = JSON.parse(fs.readFileSync(RECOVERY_LOG, "utf8")) || [];
    }
    recoveryLog.push(recoveryRecord);
    fs.writeFileSync(RECOVERY_LOG, JSON.stringify(recoveryLog, null, 2));

    logBackupHistory({
      type: "BACKUP_RESTORED",
      backupId,
      approvedBy,
      reason,
      recoveryId: recoveryRecord.id,
    });

    return {
      success: true,
      recovery: recoveryRecord,
      data: JSON.parse(decrypted),
    };
  } catch (err) {
    console.error("[Backup] Error restoring backup:", err.message);
    logBackupHistory({
      type: "BACKUP_RESTORE_FAILED",
      backupId,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
}

/**
 * Get backup history with filters
 */
function getBackupHistory(options = {}) {
  try {
    const { type, backupId, limit = 100 } = options;

    if (!fs.existsSync(BACKUP_HISTORY)) {
      return [];
    }

    let history = JSON.parse(fs.readFileSync(BACKUP_HISTORY, "utf8")) || [];

    if (type) {
      history = history.filter((h) => h.type === type);
    }
    if (backupId) {
      history = history.filter((h) => h.backupId === backupId);
    }

    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return history.slice(0, limit);
  } catch (err) {
    console.error("[Backup] Error retrieving history:", err.message);
    return [];
  }
}

/**
 * Log backup operation to history
 */
function logBackupHistory(entry) {
  try {
    let history = [];
    if (fs.existsSync(BACKUP_HISTORY)) {
      history = JSON.parse(fs.readFileSync(BACKUP_HISTORY, "utf8")) || [];
    }

    history.push({
      id: `hist_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      timestamp: new Date().toISOString(),
      ...entry,
    });

    // Keep last 10k entries
    if (history.length > 10000) {
      history = history.slice(-10000);
    }

    fs.writeFileSync(BACKUP_HISTORY, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error("[Backup] Error logging history:", err.message);
  }
}

/**
 * AES-256-GCM encryption with versioned envelope.
 */
function encryptData(data) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(String(data), "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();
  const envelope = {
    v: ENCRYPTION_VERSION,
    alg: ENCRYPTION_ALGORITHM,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: ciphertext.toString("base64"),
  };

  return `${ENCRYPTION_PREFIX}${Buffer.from(JSON.stringify(envelope), "utf8").toString("base64")}`;
}

/**
 * Decrypt v2 AES backups while staying compatible with legacy base64 backups.
 */
function decryptData(encrypted) {
  const encoded = Buffer.isBuffer(encrypted) ? encrypted.toString("utf8") : String(encrypted);

  if (encoded.startsWith(ENCRYPTION_PREFIX)) {
    const payloadB64 = encoded.slice(ENCRYPTION_PREFIX.length);
    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(
      payload.alg || ENCRYPTION_ALGORITHM,
      key,
      Buffer.from(payload.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.data, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  }

  // Legacy support for pre-v2 base64-only backups.
  return Buffer.from(encoded, "base64").toString("utf8");
}

/**
 * Auto-backup scheduled task (call from server initialization)
 */
function scheduleAutoBackups(interval = 24 * 3600 * 1000) {
  console.log("[Backup] Scheduled auto-backups enabled");

  const performBackup = () => {
    try {
      const viralProducts = require("./viral-product-scraper");
      const highCommission = require("./high-commission-products");

      const viralData = viralProducts.readViralProducts();
      const hcData = highCommission.readHighCommissionProducts();

      createBackup(viralData.products || [], {
        source: "scheduled",
        dataType: "viral_products",
        approvedBy: "system",
      });

      createBackup(hcData.products || [], {
        source: "scheduled",
        dataType: "high_commission_products",
        approvedBy: "system",
      });

      console.log("[Backup] Auto-backup completed");
    } catch (err) {
      console.error("[Backup] Auto-backup failed:", err.message);
    }
  };

  // First backup after 1 minute
  setTimeout(performBackup, 60000);

  // Then schedule recurring backups
  setInterval(performBackup, interval);
}

module.exports = {
  createBackup,
  listBackups,
  restoreFromBackup,
  getBackupHistory,
  logBackupHistory,
  getBackupManifest,
  scheduleAutoBackups,
  uploadToGoogleDrive,
  BACKUP_MANIFEST,
  BACKUP_HISTORY,
  RECOVERY_LOG,
};

/**
 * Affiliate Notifications Engine
 * 
 * Sends daily product alerts to affiliates based on:
 * - Their assigned track (viral vs high-commission)
 * - Their niche/category preferences
 * - Trending products with commission rates
 * - Performance insights (top products, new opportunities)
 */

const fs = require("fs");
const path = require("path");

const NOTIFICATIONS_FILE = path.join(__dirname, "affiliate-notifications.local.json");
const NOTIFICATION_QUEUE_FILE = path.join(__dirname, "notification-queue.local.json");

/**
 * Store notification for affiliate (email, push, in-app)
 */
function storeNotification(affiliateId, notification) {
  try {
    let notifications = [];
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, "utf8")) || [];
    }

    const entry = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      affiliateId,
      type: notification.type, // "new_product", "trending", "payout_ready", "tier_upgrade"
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      read: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), // 30 days
    };

    notifications.push(entry);
    // Keep last 10k notifications (for performance)
    if (notifications.length > 10000) {
      notifications = notifications.slice(-10000);
    }

    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
    return entry;
  } catch (err) {
    console.error("[Notifications] Error storing notification:", err.message);
    throw err;
  }
}

/**
 * Get unread notifications for affiliate
 */
function getAffiliateNotifications(affiliateId, options = {}) {
  const { limit = 50, includeRead = false } = options;
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
      return [];
    }

    let notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, "utf8")) || [];

    // Filter by affiliate
    notifications = notifications.filter((n) => n.affiliateId === affiliateId);

    // Filter by read status
    if (!includeRead) {
      notifications = notifications.filter((n) => !n.read);
    }

    // Filter by expiration
    const now = new Date();
    notifications = notifications.filter(
      (n) => new Date(n.expiresAt) > now
    );

    // Sort by newest first
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return notifications.slice(0, limit);
  } catch (err) {
    console.error("[Notifications] Error retrieving notifications:", err.message);
    return [];
  }
}

/**
 * Mark notification as read
 */
function markAsRead(notificationId) {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
      return false;
    }

    let notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, "utf8")) || [];
    const found = notifications.find((n) => n.id === notificationId);

    if (found) {
      found.read = true;
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
      return true;
    }

    return false;
  } catch (err) {
    console.error("[Notifications] Error marking as read:", err.message);
    return false;
  }
}

/**
 * Send daily product digest to affiliate
 * Recommends new products from their track + niche
 */
function sendDailyProductDigest(affiliate, newProducts) {
  try {
    const recipientId = affiliate.id || affiliate.affiliateId;
    if (!recipientId) {
      throw new Error("Affiliate identifier missing for daily digest");
    }

    // Filter by track
    let relevantProducts = newProducts;
    if (affiliate.track === "high-commission") {
      relevantProducts = newProducts.filter((p) => p.commission >= 0.15);
    } else if (affiliate.track === "viral") {
      relevantProducts = newProducts.filter((p) => p.viralScore >= 70);
    }

    const trackFilteredProducts = relevantProducts;

    // Filter by niche/category preference if available
    if (affiliate.preferredCategories && affiliate.preferredCategories.length > 0) {
      relevantProducts = relevantProducts.filter((p) =>
        affiliate.preferredCategories.some(
          (cat) => p.category.toLowerCase() === cat.toLowerCase()
        )
      );

      // If no category match, fall back to track-matched products so affiliates still get a daily digest.
      if (relevantProducts.length === 0) {
        relevantProducts = trackFilteredProducts;
      }
    }

    if (relevantProducts.length === 0) {
      return null; // No relevant products
    }

    // Build digest
    const digest = storeNotification(recipientId, {
      type: "daily_digest",
      title: `🚀 ${relevantProducts.length} New ${affiliate.track === "high-commission" ? "High-Commission" : "Viral"} Products`,
      body: `${relevantProducts.slice(0, 3).map((p) => `${p.title} (${(p.commission * 100).toFixed(0)}% commission)`).join(", ")}${relevantProducts.length > 3 ? ` + ${relevantProducts.length - 3} more` : ""}`,
      data: {
        productCount: relevantProducts.length,
        topProducts: relevantProducts.slice(0, 5).map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          commission: p.commission,
          affiliateLink: p.affiliateLink,
        })),
        averageCommission: (
          relevantProducts.reduce((sum, p) => sum + p.commission, 0) / relevantProducts.length
        ).toFixed(4),
      },
    });

    console.log(
      `[Notifications] Sent daily digest to ${recipientId}: ${relevantProducts.length} products`
    );
    return digest;
  } catch (err) {
    console.error("[Notifications] Error sending daily digest:", err.message);
    return null;
  }
}

/**
 * Alert on tier upgrade
 */
function notifyTierUpgrade(affiliateId, newTier, achievement) {
  return storeNotification(affiliateId, {
    type: "tier_upgrade",
    title: `🎉 Congratulations! You've been promoted to ${newTier.toUpperCase()} tier!`,
    body: `You've reached ${achievement}. Enjoy increased commission rates and exclusive perks!`,
    data: {
      newTier,
      achievement,
    },
  });
}

/**
 * Alert on payout ready
 */
function notifyPayoutReady(affiliateId, amount, method) {
  return storeNotification(affiliateId, {
    type: "payout_ready",
    title: `💰 Payout Ready: ${amount.toFixed(2)} USD`,
    body: `Your ${method} payout has been processed. Check your wallet!`,
    data: {
      amount,
      method,
    },
  });
}

/**
 * Alert on trending product opportunity
 */
function notifyTrendingProduct(affiliateId, product) {
  return storeNotification(affiliateId, {
    type: "trending_product",
    title: `🔥 ${product.title} is TRENDING!`,
    body: `${(product.commission * 100).toFixed(0)}% commission | $${product.price} | ${product.viralScore || product.trendingScore || 0} trending score`,
    data: {
      productId: product.id,
      product,
    },
  });
}

/**
 * Broadcast notification to all affiliates in a tier
 */
function broadcastToTier(tier, notification, affiliates) {
  try {
    const tierAffiliates = affiliates.filter((a) => a.tier === tier);
    const sent = [];

    tierAffiliates.forEach((affiliate) => {
      const recipientId = affiliate.id || affiliate.affiliateId;
      if (!recipientId) {
        return;
      }
      const notif = storeNotification(recipientId, notification);
      sent.push(notif.id);
    });

    console.log(`[Notifications] Broadcast to ${tier} tier: ${sent.length} affiliates notified`);
    return sent;
  } catch (err) {
    console.error("[Notifications] Error broadcasting:", err.message);
    return [];
  }
}

/**
 * Queue notifications for batch delivery (email/push)
 */
function queueForDelivery(notificationIds, deliveryMethod = "email") {
  try {
    let queue = [];
    if (fs.existsSync(NOTIFICATION_QUEUE_FILE)) {
      queue = JSON.parse(fs.readFileSync(NOTIFICATION_QUEUE_FILE, "utf8")) || [];
    }

    notificationIds.forEach((id) => {
      queue.push({
        notificationId: id,
        deliveryMethod,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    });

    fs.writeFileSync(NOTIFICATION_QUEUE_FILE, JSON.stringify(queue, null, 2));
    console.log(
      `[Notifications] Queued ${notificationIds.length} for ${deliveryMethod} delivery`
    );
    return queue;
  } catch (err) {
    console.error("[Notifications] Error queuing for delivery:", err.message);
    return [];
  }
}

/**
 * Get notification delivery queue (for background job to process)
 */
function getDeliveryQueue() {
  try {
    if (!fs.existsSync(NOTIFICATION_QUEUE_FILE)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(NOTIFICATION_QUEUE_FILE, "utf8")) || [];
  } catch (err) {
    console.error("[Notifications] Error reading delivery queue:", err.message);
    return [];
  }
}

/**
 * Mark queue item as sent
 */
function markQueueItemSent(queueItemId) {
  try {
    if (!fs.existsSync(NOTIFICATION_QUEUE_FILE)) {
      return false;
    }

    let queue = JSON.parse(fs.readFileSync(NOTIFICATION_QUEUE_FILE, "utf8")) || [];
    const found = queue.find((q) => q.notificationId === queueItemId);

    if (found) {
      found.status = "sent";
      found.sentAt = new Date().toISOString();
      fs.writeFileSync(NOTIFICATION_QUEUE_FILE, JSON.stringify(queue, null, 2));
      return true;
    }

    return false;
  } catch (err) {
    console.error("[Notifications] Error marking queue item sent:", err.message);
    return false;
  }
}

module.exports = {
  storeNotification,
  getAffiliateNotifications,
  markAsRead,
  sendDailyProductDigest,
  notifyTierUpgrade,
  notifyPayoutReady,
  notifyTrendingProduct,
  broadcastToTier,
  queueForDelivery,
  getDeliveryQueue,
  markQueueItemSent,
};

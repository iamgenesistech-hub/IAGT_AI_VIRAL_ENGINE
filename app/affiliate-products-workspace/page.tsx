"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const externalBase = process.env.NEXT_PUBLIC_EVICS_API_BASE_URL || "http://localhost:8080";

const dailyVideoIdeas = [
  {
    key: "health",
    label: "Health, diet, recipes",
    description: "Use this lane for daily wellness, recipes, and lifestyle encouragement.",
    fallbackTitle: "Dr. Sebi Wellness Brief",
  },
  {
    key: "investing",
    label: "Investing tutorials",
    description: "Use this lane for day trading, stocks, crypto, and market education.",
    fallbackTitle: "Board Trading Tutorial",
  },
  {
    key: "spiritual",
    label: "Spiritual guidance",
    description: "Use this lane for motivation, scripture, prayer, and encouragement.",
    fallbackTitle: "Daily Encouragement Video",
  },
  {
    key: "custom",
    label: "Custom creator video",
    description: "Use this lane for any YouTube or hosted video you choose to send.",
    fallbackTitle: "Custom Affiliate Video",
  }
];

const adultSensitiveKeywords = [
  "adult",
  "alcohol",
  "betting",
  "casino",
  "dating",
  "gambling",
  "intimate",
  "lingerie",
  "sexual",
  "smoke",
  "tobacco",
  "vape"
];

function money(value: number | string | undefined | null) {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function percent(value: number | string | undefined | null) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function buildQuery(path: string, params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export default function AffiliateProductsWorkspacePage() {
  const [affiliateQuery, setAffiliateQuery] = useState("");
  const [affiliateStatus, setAffiliateStatus] = useState("all");
  const [affiliateId, setAffiliateId] = useState("");
  const [selectorData, setSelectorData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [tradealgoStatus, setTradealgoStatus] = useState<any>(null);
  const [tradealgoHistory, setTradealgoHistory] = useState<any[]>([]);
  const [principles, setPrinciples] = useState<string[]>([]);
  const [scalingDirectives, setScalingDirectives] = useState<string[]>([]);
  const [packageUrl, setPackageUrl] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaId, setMediaId] = useState("video-");
  const [landingUrl, setLandingUrl] = useState("");
  const [buyUrl, setBuyUrl] = useState("");
  const [dailyVideoUrl, setDailyVideoUrl] = useState("");
  const [dailyVideoTitle, setDailyVideoTitle] = useState("");
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [accessControl, setAccessControl] = useState<any>(null);
  const [accessSaving, setAccessSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedAffiliate = selectorData?.selected?.summary?.affiliate || null;
  const analytics = selectorData?.selected?.summary || null;

  const affiliateOptions = selectorData?.options || [];
  const productList = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const minorFilterEnabled = Boolean(accessControl?.isMinor && !accessControl?.adultCatalogAccessEnabled);
    return (products || []).filter((item: any) => {
      if (!q) return true;
      const matchesSearch = [item.title, item.description, item.category, item.source, item.id].some((field) => String(field || "").toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (!minorFilterEnabled) return true;
      const haystack = [item.title, item.description, item.category, item.tags].map((part) => String(part || "").toLowerCase()).join(" ");
      return !adultSensitiveKeywords.some((keyword) => haystack.includes(keyword));
    });
  }, [accessControl?.adultCatalogAccessEnabled, accessControl?.isMinor, products, productQuery]);

  useEffect(() => {
    let cancelled = false;
    async function loadSelector() {
      try {
        setError("");
        const response = await fetch(buildQuery("/api/affiliate/analytics/affiliates", {
          q: affiliateQuery,
          status: affiliateStatus,
          affiliateId,
        }));
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load affiliate selector.");
        if (cancelled) return;
        setSelectorData(payload);
        if (!affiliateId || !payload.options.some((option: any) => option.id === affiliateId)) {
          setAffiliateId(payload.selectedId || payload.options?.[0]?.id || "");
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not load affiliate selector.");
      }
    }
    loadSelector();
    return () => { cancelled = true; };
  }, [affiliateQuery, affiliateStatus]);

  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      try {
        const response = await fetch(buildQuery("/api/affiliate/workspace/products", {
          source: "all",
          q: productQuery,
        }));
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load products.");
        if (!cancelled) setProducts(payload.products || []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not load products.");
      }
    }
    loadProducts();
    return () => { cancelled = true; };
  }, [productQuery]);

  useEffect(() => {
    let cancelled = false;
    async function loadSidebarData() {
      if (!affiliateId) return;
      try {
        const [snapshotsResponse, statusResponse, historyResponse] = await Promise.all([
          fetch(buildQuery("/api/affiliate/analytics/snapshots", { affiliateId })),
          fetch("/api/admin/trading-signals/status"),
          fetch(buildQuery("/api/affiliate/trading-signals/history", { affiliateId, limit: 10 })),
        ]);
        const [snapshotsPayload, statusPayload, historyPayload] = await Promise.all([
          snapshotsResponse.json(),
          statusResponse.json(),
          historyResponse.json(),
        ]);
        if (cancelled) return;
        setSnapshots(snapshotsPayload.snapshots || []);
        setTradealgoStatus(statusPayload);
        setTradealgoHistory(historyPayload.history || []);

        const accessResponse = await fetch(`/api/affiliate/access-controls/${encodeURIComponent(affiliateId)}`);
        const accessPayload = await accessResponse.json();
        if (!cancelled && accessPayload?.success) {
          setAccessControl(accessPayload.accessControl || null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not load affiliate history.");
      }
    }
    loadSidebarData();
    return () => { cancelled = true; };
  }, [affiliateId]);

  useEffect(() => {
    let cancelled = false;
    async function loadGovernance() {
      try {
        const [principlesResponse, scalingResponse] = await Promise.all([
          fetch("/api/governance/investment-principles"),
          fetch("/api/governance/scaling-directives"),
        ]);
        const [principlesPayload, scalingPayload] = await Promise.all([
          principlesResponse.json(),
          scalingResponse.json(),
        ]);
        if (cancelled) return;
        setPrinciples(principlesPayload.investmentPrinciples || []);
        setScalingDirectives(scalingPayload.directives || []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not load governance guidance.");
      }
    }
    loadGovernance();
    return () => { cancelled = true; };
  }, []);

  async function saveSnapshot() {
    if (!affiliateId) return;
    setSnapshotSaving(true);
    try {
      const response = await fetch("/api/affiliate/analytics/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId, trigger: "workspace", actor: "affiliate-workspace" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save snapshot.");
      setSnapshots((current) => [payload.snapshot, ...current]);
    } catch (err: any) {
      setError(err.message || "Could not save snapshot.");
    } finally {
      setSnapshotSaving(false);
    }
  }

  async function createPackage(product: any) {
    if (!affiliateId) {
      setError("Select an affiliate first.");
      return;
    }
    const safeMediaId = mediaId.trim() || `video-${Date.now()}`;
    const landingPage = `/api/affiliate/landing/${encodeURIComponent(product.id)}?affiliateId=${encodeURIComponent(affiliateId)}`;
    const preferredVideo = videoUrl.trim() || (dailyVideoUrl.trim() ? dailyVideoUrl.trim() : "");
    const url = buildQuery(`/api/affiliate/video-package/${encodeURIComponent(affiliateId)}/${encodeURIComponent(safeMediaId)}`, {
      productId: product.id,
      productTitle: product.title,
      videoUrl: preferredVideo,
      landingPageUrl: landingPage,
      buyButtonUrl: landingPage,
    });
    setSelectedProduct(product);
    setLandingUrl(landingPage);
    setBuyUrl(landingPage);
    setPackageUrl(url);
    setDailyVideoTitle(product.title);
    if (!videoUrl.trim() && preferredVideo) setVideoUrl(preferredVideo);
    try {
      setDeliverySaving(true);
      await fetch("/api/affiliate/video/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId,
          affiliateCode: selectedAffiliate?.code || affiliateId,
          mediaId: safeMediaId,
          productId: product.id,
          productTitle: product.title,
          videoUrl: preferredVideo,
          landingPageUrl: landingPage,
          buyButtonUrl: landingPage,
          hasVideo: Boolean(preferredVideo),
          hasLandingPage: true,
          hasBuyButton: true,
          source: "workspace",
        }),
      });
    } catch (err: any) {
      setError(err.message || "Could not record delivery.");
    } finally {
      setDeliverySaving(false);
    }
  }

  async function saveAccessControl() {
    if (!affiliateId || !accessControl) return;
    setAccessSaving(true);
    try {
      const response = await fetch("/api/affiliate/access-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId,
          isMinor: Boolean(accessControl.isMinor),
          parentConsentGranted: Boolean(accessControl.parentConsentGranted),
          parentGuardianName: String(accessControl.parentGuardianName || ""),
          parentConsentEvidenceUrl: String(accessControl.parentConsentEvidenceUrl || ""),
          parentConsentRecordedAt: String(accessControl.parentConsentRecordedAt || ""),
          adultCatalogAccessEnabled: Boolean(accessControl.adultCatalogAccessEnabled),
          adultCatalogOverrideBy: String(accessControl.adultCatalogOverrideBy || ""),
          adultCatalogOverrideReason: String(accessControl.adultCatalogOverrideReason || ""),
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Could not save access control settings.");
      }
      setAccessControl(payload.accessControl || null);
    } catch (err: any) {
      setError(err.message || "Could not save access control settings.");
    } finally {
      setAccessSaving(false);
    }
  }

  function useDailyVideoSuggestion(title: string, url: string) {
    setDailyVideoTitle(title);
    setDailyVideoUrl(url);
    setVideoUrl(url);
  }

  const boardFallbackTitle = selectedAffiliate?.track === "high-commission"
    ? "Board fallback: Investing tutorial"
    : "Board fallback: Wellness and encouragement";

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>iamgenesistech.com Affiliate Portal</p>
          <h1 className={styles.title}>Affiliate workflow, video delivery, analytics, and board guidance in one place.</h1>
          <p className={styles.subtitle}>
            Affiliates can view products, video packages, landing pages, profits, TradeAlgo signals, training, and board advice from the same workspace.
          </p>
        </div>
        <div className={styles.heroActions}>
          <a className={styles.primaryAction} href={`${externalBase}/affiliate-manual.html`} target="_blank" rel="noreferrer">Open Affiliate Manual</a>
          <a className={styles.secondaryAction} href={`${externalBase}/trading-education.html`} target="_blank" rel="noreferrer">Open Trading Education</a>
          <a className={styles.secondaryAction} href={`${externalBase}/status`} target="_blank" rel="noreferrer">Open System Status</a>
        </div>
      </section>

      {error ? <div className={styles.alert}>{error}</div> : null}

      <section className={styles.toolbar}>
        <label>
          <span>Search affiliate</span>
          <input value={affiliateQuery} onChange={(event) => setAffiliateQuery(event.target.value)} placeholder="Search by name, code, or id" />
        </label>
        <label>
          <span>Status</span>
          <select value={affiliateStatus} onChange={(event) => setAffiliateStatus(event.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <label>
          <span>Affiliate</span>
          <select value={affiliateId} onChange={(event) => setAffiliateId(event.target.value)}>
            {affiliateOptions.map((option: any) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <button className={styles.primaryAction} onClick={saveSnapshot} disabled={!affiliateId || snapshotSaving}>
          {snapshotSaving ? "Saving snapshot..." : "Save GCS Snapshot"}
        </button>
      </section>

      <section className={styles.grid}>
        <div className={styles.leftColumn}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Selected affiliate</p>
                <h2>{selectedAffiliate ? `${selectedAffiliate.name} (${selectedAffiliate.code})` : "Select an affiliate"}</h2>
              </div>
              <span className={styles.badge}>{selectedAffiliate?.track || "viral"}</span>
            </div>

            {analytics ? (
              <>
                <div className={styles.statGrid}>
                  <article><span>Total sales</span><strong>{money(analytics.progress?.totalSales)}</strong></article>
                  <article><span>Total earnings</span><strong>{money(analytics.progress?.totalEarnings)}</strong></article>
                  <article><span>Pending balance</span><strong>{money(analytics.progress?.pendingBalance)}</strong></article>
                  <article><span>Conversion rate</span><strong>{percent(analytics.performance?.conversionPerVideoSent)}</strong></article>
                  <article><span>Videos sent</span><strong>{analytics.instrumentation?.totalVideosSent || 0}</strong></article>
                  <article><span>Fully instrumented</span><strong>{analytics.instrumentation?.fullyInstrumented || 0}</strong></article>
                </div>

                <div className={styles.noteBox}>
                  <p><strong>Board share:</strong> {money(analytics.boardShare?.grossRevenue)} gross, {money(analytics.boardShare?.commissionEarned)} commission earned, {analytics.boardShare?.fullyInstrumentedVideos || 0} fully instrumented videos.</p>
                  <p><strong>Learning loop:</strong> {analytics.learningLoop?.recommendations?.[0] || "No recommendation yet."}</p>
                </div>
              </>
            ) : (
              <p className={styles.emptyState}>Choose an affiliate to view progress, income, and company-visible analytics.</p>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Board guidance</p>
                <h2>Investment principles for the logged-in affiliate</h2>
              </div>
            </div>
            <div className={styles.pillRow}>
              {(principles || []).slice(0, 6).map((principle) => <span key={principle} className={styles.pill}>{principle}</span>)}
            </div>
            <div className={styles.noteBox}>
              <p><strong>{boardFallbackTitle}</strong></p>
              <p>Fallback recommendations should be selected from the board if you do not manually choose a video.</p>
            </div>
            <ul className={styles.list}>
              {(scalingDirectives || []).slice(0, 4).map((directive) => <li key={directive}>{directive}</li>)}
            </ul>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>TradeAlgo + paper trading</p>
                <h2>Up-to-the-minute signals and practice trading lane</h2>
              </div>
            </div>
            <div className={styles.statGrid}>
              <article><span>TradeAlgo connected</span><strong>{tradealgoStatus?.tradealgoConnected ? "Yes" : "No"}</strong></article>
              <article><span>Last signal</span><strong>{tradealgoStatus?.lastSignalType || "None"}</strong></article>
              <article><span>History rows</span><strong>{tradealgoHistory.length}</strong></article>
              <article><span>Practice mode</span><strong>Paper trade ready</strong></article>
            </div>
            <div className={styles.noteBox}>
              <p>Use paper trading until the affiliate is ready to trade independently. Pair this with tradealgo signals, then review outcomes inside the affiliate analytics view.</p>
              <a className={styles.secondaryAction} href={`${externalBase}/affiliate-manual.html#trading-signals`} target="_blank" rel="noreferrer">Open Trading Signals Guide</a>
            </div>
            <div className={styles.listCard}>
              {(tradealgoHistory || []).slice(0, 5).map((signal: any) => (
                <div key={`${signal.timestamp}-${signal.signalId || signal.type}`} className={styles.listRow}>
                  <strong>{signal.type}</strong>
                  <span>{signal.asset || signal.signalId || signal.affiliateId || signal.timestamp}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Daily video rails</p>
                <h2>Send health, investing, spiritual, or custom videos</h2>
              </div>
            </div>
            <div className={styles.videoGrid}>
              {dailyVideoIdeas.map((idea) => {
                const fallbackUrl = idea.key === "health"
                  ? `${externalBase}/affiliate-manual.html#health`
                  : idea.key === "investing"
                    ? `${externalBase}/affiliate-manual.html#trading-signals`
                    : idea.key === "spiritual"
                      ? `${externalBase}/affiliate-manual.html#spiritual`
                      : `${externalBase}/affiliate-manual.html#video`;
                return (
                  <article key={idea.key} className={styles.videoCard}>
                    <p className={styles.panelLabel}>{idea.label}</p>
                    <h3>{idea.fallbackTitle}</h3>
                    <p>{idea.description}</p>
                    <button className={styles.secondaryAction} onClick={() => useDailyVideoSuggestion(idea.fallbackTitle, fallbackUrl)}>
                      Use suggestion
                    </button>
                  </article>
                );
              })}
            </div>
            <label className={styles.fullWidthField}>
              <span>YouTube or hosted video link</span>
              <input value={dailyVideoUrl} onChange={(event) => setDailyVideoUrl(event.target.value)} placeholder="https://youtube.com/..." />
            </label>
            <label className={styles.fullWidthField}>
              <span>Video title</span>
              <input value={dailyVideoTitle} onChange={(event) => setDailyVideoTitle(event.target.value)} placeholder="Daily encouragement, training, or product video" />
            </label>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Executive access control</p>
                <h2>Minor-safe mode and parental approval evidence</h2>
              </div>
            </div>
            <div className={styles.noteBox}>
              <p>
                Minor mode limits catalog visibility. Adult catalog requires parent consent, guardian name, and photo evidence URL.
              </p>
            </div>
            <div className={styles.checkboxRow}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(accessControl?.isMinor)}
                  onChange={(event) => setAccessControl((current: any) => ({
                    ...(current || {}),
                    isMinor: event.target.checked,
                    adultCatalogAccessEnabled: event.target.checked ? Boolean(current?.adultCatalogAccessEnabled) : true
                  }))}
                />
                <span>Minor account (13-17)</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(accessControl?.parentConsentGranted)}
                  onChange={(event) => setAccessControl((current: any) => ({ ...(current || {}), parentConsentGranted: event.target.checked }))}
                />
                <span>Parent consent granted</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(accessControl?.adultCatalogAccessEnabled)}
                  onChange={(event) => setAccessControl((current: any) => ({ ...(current || {}), adultCatalogAccessEnabled: event.target.checked }))}
                  disabled={!accessControl?.isMinor}
                />
                <span>Enable adult catalog access override</span>
              </label>
            </div>
            <label className={styles.fullWidthField}>
              <span>Parent / guardian full name</span>
              <input
                value={String(accessControl?.parentGuardianName || "")}
                onChange={(event) => setAccessControl((current: any) => ({ ...(current || {}), parentGuardianName: event.target.value }))}
                placeholder="Parent or legal guardian full name"
              />
            </label>
            <label className={styles.fullWidthField}>
              <span>Parent photo evidence URL</span>
              <input
                value={String(accessControl?.parentConsentEvidenceUrl || "")}
                onChange={(event) => setAccessControl((current: any) => ({ ...(current || {}), parentConsentEvidenceUrl: event.target.value }))}
                placeholder="https://... parent + child signed consent image"
              />
            </label>
            <div className={styles.gridTwo}>
              <label className={styles.fullWidthField}>
                <span>Override by</span>
                <input
                  value={String(accessControl?.adultCatalogOverrideBy || "")}
                  onChange={(event) => setAccessControl((current: any) => ({ ...(current || {}), adultCatalogOverrideBy: event.target.value }))}
                  placeholder="Executive name"
                />
              </label>
              <label className={styles.fullWidthField}>
                <span>Override reason</span>
                <input
                  value={String(accessControl?.adultCatalogOverrideReason || "")}
                  onChange={(event) => setAccessControl((current: any) => ({ ...(current || {}), adultCatalogOverrideReason: event.target.value }))}
                  placeholder="Reason for adult access toggle"
                />
              </label>
            </div>
            <button className={styles.primaryAction} onClick={saveAccessControl} disabled={!affiliateId || accessSaving}>
              {accessSaving ? "Saving access control..." : "Save Access Control"}
            </button>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Product marketplace</p>
                <h2>All products and affiliate options</h2>
              </div>
            </div>
            {accessControl?.isMinor && !accessControl?.adultCatalogAccessEnabled ? (
              <div className={styles.noteBox}>
                <p>Minor-safe filter active: adult-sensitive products are hidden until executive override is approved.</p>
              </div>
            ) : null}
            <label className={styles.fullWidthField}>
              <span>Search products</span>
              <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="viral, high commission, category, id" />
            </label>
            <div className={styles.productList}>
              {productList.slice(0, 24).map((product: any) => (
                <article key={product.id} className={styles.productCard}>
                  <div className={styles.productHeader}>
                    <div>
                      <strong>{product.title}</strong>
                      <span>{product.source} • {product.category} • {money(product.price)}</span>
                    </div>
                    <span className={styles.badge}>{Math.round(product.viralScore || product.trendingScore || 0)}</span>
                  </div>
                  <p>{product.description}</p>
                  <div className={styles.cardActions}>
                    <a className={styles.secondaryAction} href={buildQuery(`/api/affiliate/landing/${encodeURIComponent(product.id)}`, { affiliateId })} target="_blank" rel="noreferrer">Landing page</a>
                    <button className={styles.primaryAction} onClick={() => createPackage(product)} disabled={!affiliateId || deliverySaving}>
                      {deliverySaving && selectedProduct?.id === product.id ? "Recording..." : "Create video package"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Rendered delivery</p>
                <h2>Video, buy button, and landing page preview</h2>
              </div>
            </div>
            <div className={styles.fullWidthField}>
              <span>Media ID</span>
              <input value={mediaId} onChange={(event) => setMediaId(event.target.value)} placeholder="video-001" />
            </div>
            <div className={styles.fullWidthField}>
              <span>Video URL override</span>
              <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://..." />
            </div>
            <div className={styles.gridTwo}>
              <div className={styles.noteBox}><strong>Landing page</strong><p>{landingUrl || "Select a product to generate a landing page."}</p></div>
              <div className={styles.noteBox}><strong>Buy button</strong><p>{buyUrl || "Buy button will point at the generated landing page."}</p></div>
            </div>
            <div className={styles.cardActions}>
              <a className={styles.secondaryAction} href={packageUrl || "#"} target="_blank" rel="noreferrer">Open package</a>
              <button className={styles.primaryAction} onClick={() => packageUrl && setPackageUrl(`${packageUrl}&t=${Date.now()}`)} disabled={!packageUrl}>Refresh package</button>
            </div>
            <div className={styles.previewFrameWrap}>
              {packageUrl ? <iframe key={packageUrl} title="Affiliate video package" src={packageUrl} className={styles.previewFrame} /> : <div className={styles.emptyState}>Select a product and click create video package to render the package view here.</div>}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Affiliate progress</p>
                <h2>Company-visible history, profits, and recall</h2>
              </div>
            </div>
            <div className={styles.statGrid}>
              <article><span>Snapshots stored</span><strong>{snapshots.length}</strong></article>
              <article><span>Top tier</span><strong>{analytics?.progress?.tier?.name || selectedAffiliate?.tier || "Starter"}</strong></article>
              <article><span>Next tier</span><strong>{analytics?.progress?.nextTier?.name || "N/A"}</strong></article>
              <article><span>Fully instrumented</span><strong>{analytics?.instrumentation?.fullyInstrumented || 0}</strong></article>
            </div>
            <div className={styles.listCard}>
              {(snapshots || []).slice(0, 5).map((snapshot: any) => (
                <div key={snapshot.id} className={styles.listRow}>
                  <strong>{snapshot.selectedAffiliate?.affiliate?.name || snapshot.selectedAffiliateId || "Snapshot"}</strong>
                  <span>{snapshot.generatedAt || snapshot.updatedAt}</span>
                </div>
              ))}
            </div>
            <div className={styles.noteBox}>
              <p>Snapshots are recallable from the workspace and saved through the backend storage layer. If Google credentials and a bucket are configured, they are also uploaded to GCS.</p>
            </div>
          </div>

        </div>
      </section>

      <section className={styles.footerRail}>
        <div className={styles.footerChip}><span>Selected affiliate</span><strong>{selectedAffiliate?.name || "None"}</strong></div>
        <div className={styles.footerChip}><span>Daily video</span><strong>{dailyVideoTitle || "Not selected"}</strong></div>
        <div className={styles.footerChip}><span>TradeAlgo</span><strong>{tradealgoStatus?.tradealgoConnected ? "Live" : "Waiting for API key"}</strong></div>
      </section>
    </main>
  );
}
import styles from "./page.module.css";

const backendBase = process.env.NEXT_PUBLIC_EVICS_API_BASE_URL || "http://localhost:8080";

export default function WorkspacePage() {
  const affiliateWorkspaceUrl = "/affiliate-products-workspace";

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>EVICS Elite Executive Workspace</h1>
          <p className={styles.subtitle}>
            Use the affiliate product workspace below to manage video packages, landing pages, buy buttons, analytics, and learning-loop snapshots.
          </p>
        </div>
        <div className={styles.links}>
          <a className={styles.link} href={affiliateWorkspaceUrl} target="_blank" rel="noreferrer">
            Open Affiliate Workspace
          </a>
        </div>
      </header>

      <section className={styles.framePanel}>
        <iframe
          title="Affiliate Product Workspace"
          src={affiliateWorkspaceUrl}
          className={styles.frame}
        />
      </section>
    </main>
  );
}
// backend/publishWorker.js
// Simple single-process publish worker for local demo queue
// Usage:
//   node backend/publishWorker.js           -> run once and exit
//   node backend/publishWorker.js --daemon --interval=60 -> run in daemon mode, polling every 60s

const fs = require('fs');
const path = require('path');

const QUEUE_PATH = path.join(__dirname, '..', 'generated', 'local_publishing_queue.json');
const HISTORY_PATH = path.join(__dirname, '..', 'generated', 'local_publishing_history.json');
const LOCK_PATH = path.join(__dirname, '..', 'generated', 'local_publishing_queue.lock');

function safeReadJson(p) {
  try {
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8') || '[]';
    return JSON.parse(raw) || [];
  } catch (e) {
    console.warn('safeReadJson failed for', p, e.message || e);
    return [];
  }
}

function safeWriteJsonAtomic(p, obj) {
  try {
    const tmp = p + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
    fs.renameSync(tmp, p);
    return true;
  } catch (e) {
    console.warn('safeWriteJsonAtomic failed for', p, e.message || e);
    return false;
  }
}

function lockExists() {
  try { return fs.existsSync(LOCK_PATH); } catch { return false; }
}

function writeLock() {
  try { fs.writeFileSync(LOCK_PATH, String(process.pid), 'utf8'); } catch (e) { }
}

function removeLock() {
  try { if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH); } catch (e) { }
}

async function tryInsertToSupabase(entry, SupabaseConnector) {
  if (!SupabaseConnector || typeof SupabaseConnector.from !== 'function') {
    throw new Error('Supabase connector not available');
  }
  const payload = {
    creative_id: entry.creative_id,
    channel: entry.channel || 'Media Output Center',
    status: entry.status || 'Queued',
    content: entry.content || '',
    publish_at: entry.publish_at || new Date().toISOString(),
    created_at: entry.created_at || new Date().toISOString()
  };
  const { data, error } = await SupabaseConnector.from('publishing_queue').insert([payload]).select();
  if (error) throw error;
  return data && data[0];
}

async function processQueueOnce(options = {}) {
  const SupabaseConnector = options.SupabaseConnector || null;

  if (lockExists()) {
    console.warn('Publish worker lock present; aborting this run to avoid concurrent writers.');
    return;
  }
  writeLock();

  try {
    const queue = safeReadJson(QUEUE_PATH) || [];
    if (!queue.length) {
      console.log('Publish worker: queue empty.');
      return;
    }

    const history = safeReadJson(HISTORY_PATH) || [];

    // Process up to N items to avoid long runs; default 5
    const batchSize = Number(options.batchSize || 5);
    const toProcess = queue.slice(0, batchSize);
    const remaining = queue.slice(batchSize);

    for (const item of toProcess) {
      console.log('Processing publish item:', item.creative_id || item.content || '(no id)');
      let processed = false;
      let result = { status: 'failed', processedAt: new Date().toISOString(), creative_id: item.creative_id || null };

      // Try Supabase if connector present
      if (SupabaseConnector) {
        try {
          const inserted = await tryInsertToSupabase(item, SupabaseConnector);
          result = { ...result, status: 'supabase_enqueued', supabase: inserted };
          processed = true;
          console.log('Inserted into Supabase publishing_queue for', item.creative_id);
        } catch (e) {
          console.warn('Supabase enqueue failed:', e && e.message ? e.message : String(e));
        }
      }

      if (!processed) {
        // Simulate publish (demo). Real publishing logic would call channel APIs here.
        try {
          // Here, we simulate success and mark published
          result = { ...result, status: 'published', publishedAt: new Date().toISOString(), note: 'local-simulated-publish' };
          processed = true;
          console.log('Simulated publish for', item.creative_id);
        } catch (e) {
          console.warn('Simulated publish failed:', e && e.message ? e.message : String(e));
          result = { ...result, status: 'failed', error: e && e.message ? e.message : String(e) };
        }
      }

      // Append to history and continue
      try {
        history.unshift({ ...item, processed: true, result });
      } catch (e) { console.warn('History push failed', e && e.message ? e.message : String(e)); }
    }

    // Write updated files atomically
    try {
      safeWriteJsonAtomic(HISTORY_PATH, history);
    } catch (e) { console.warn('Failed to write history', e && e.message ? e.message : String(e)); }

    try {
      safeWriteJsonAtomic(QUEUE_PATH, remaining);
    } catch (e) { console.warn('Failed to write remaining queue', e && e.message ? e.message : String(e)); }

    console.log(`Publish worker processed ${toProcess.length} item(s). Remaining in queue: ${remaining.length}`);
  } catch (e) {
    console.error('Publish worker run failed:', e && e.message ? e.message : String(e));
  } finally {
    removeLock();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const daemon = args.includes('--daemon');
  const intervalArg = args.find(a => a.startsWith('--interval='));
  const interval = intervalArg ? Number(intervalArg.split('=')[1]) : Number(process.env.PUBLISH_WORKER_INTERVAL || 60);

  console.log('Publish worker starting. mode=', daemon ? 'daemon' : 'once', ' interval=', interval);

  if (!daemon) {
    await processQueueOnce();
    console.log('Publish worker completed single run.');
    process.exit(0);
    return;
  }

  // Daemon loop
  await processQueueOnce();
  setInterval(async () => {
    await processQueueOnce();
  }, Math.max(10, interval) * 1000);
}

if (require.main === module) {
  main().catch((e) => { console.error('Publish worker error:', e && e.message ? e.message : String(e)); process.exit(1); });
}

module.exports = { processQueueOnce };

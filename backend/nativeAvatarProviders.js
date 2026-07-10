'use strict';

const { JOB_STATUS } = require('./nativeAvatarJobStore');

const SUPPORTED_PROVIDERS = new Set(['heygen', 'evics_native', 'auto']);

function resolveProvider(requestedProvider) {
  const requested = String(requestedProvider || '').trim().toLowerCase();
  const envDefault = String(process.env.EVICS_NATIVE_AVATAR_PROVIDER || 'heygen').trim().toLowerCase();
  const candidate = requested || envDefault || 'heygen';
  if (!SUPPORTED_PROVIDERS.has(candidate)) {
    return 'heygen';
  }
  if (candidate === 'auto') {
    return String(process.env.EVICS_NATIVE_AVATAR_AUTO_TARGET || 'heygen').trim().toLowerCase() === 'evics_native'
      ? 'evics_native'
      : 'heygen';
  }
  return candidate;
}

function buildProviderRouter(deps = {}) {
  const {
    createHeyGenJob = async () => {
      throw new Error('HeyGen provider handler is not configured.');
    },
    createEvicsNativeJob = async () => ({
      accepted: true,
      status: JOB_STATUS.QUEUED,
      runId: `native_stub_${Date.now()}`,
      externalReference: null,
      message: 'EVICS native provider stub accepted the job.',
    }),
  } = deps;

  async function submit(job) {
    const provider = resolveProvider(job.provider);
    if (provider === 'evics_native') {
      const response = await createEvicsNativeJob(job);
      return { provider, ...response };
    }
    const response = await createHeyGenJob(job);
    return { provider: 'heygen', ...response };
  }

  return {
    submit,
    resolveProvider,
    SUPPORTED_PROVIDERS,
  };
}

module.exports = {
  buildProviderRouter,
  resolveProvider,
  SUPPORTED_PROVIDERS,
};


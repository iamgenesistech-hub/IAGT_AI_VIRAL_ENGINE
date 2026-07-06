'use strict';

const fs = require('fs');
const path = require('path');

let cachedState = null;

function normalizeEnvPath(value) {
  return String(value || '').trim().replace(/^"(.*)"$/, '$1');
}

function resolveFirestoreState(admin) {
  if (admin && typeof admin.firestore === 'function') {
    return {
      client: admin.firestore(),
      mode: 'firebase-admin',
      configured: true,
      source: 'admin-argument'
    };
  }

  if (cachedState) return cachedState;

  try {
    const { Firestore } = require('@google-cloud/firestore');
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIRESTORE_PROJECT_ID || undefined;
    const credentialsJson = String(process.env.FIRESTORE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '').trim();
    const keyFilename = normalizeEnvPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const runningOnGcp = Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.GAE_ENV);
    const options = {};
    let mode = 'disabled';
    let source = 'no-valid-firestore-credentials';
    let configured = false;

    if (credentialsJson) {
      const parsed = JSON.parse(credentialsJson);
      options.credentials = parsed;
      options.projectId = projectId || parsed.project_id || undefined;
      mode = 'service-account-json';
      source = 'env-json';
      configured = true;
    } else if (keyFilename && fs.existsSync(keyFilename)) {
      options.keyFilename = path.resolve(keyFilename);
      options.projectId = projectId;
      mode = 'service-account-file';
      source = options.keyFilename;
      configured = true;
    } else if (runningOnGcp) {
      options.projectId = projectId;
      mode = 'application-default';
      source = 'cloud-run-adc';
      configured = true;
    } else if (keyFilename) {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      source = `missing-credential-file:${keyFilename}`;
    }

    const client = configured ? new Firestore(options) : null;
    cachedState = {
      client,
      mode,
      configured,
      source
    };
  } catch (error) {
    cachedState = {
      client: null,
      mode: 'unavailable',
      configured: false,
      source: error.message
    };
  }

  return cachedState;
}

module.exports = {
  resolveFirestoreState
};

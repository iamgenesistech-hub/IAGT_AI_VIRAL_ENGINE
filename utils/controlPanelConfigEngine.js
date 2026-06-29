function updateControlSettings(currentSettings, updates) {
  return {
    ...currentSettings,
    ...updates,
    updatedAt: new Date().toISOString()
  };
}

module.exports = { updateControlSettings };

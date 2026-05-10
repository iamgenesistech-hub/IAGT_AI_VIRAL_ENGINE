require('dotenv').config();

const EVICS_MASTER_CONFIG = require('../configs/evicsMasterConfig');

function testSystem() {

  console.log("EVICS Master Configuration Initialized...");

  console.log(
    "Minimum Viral Views:",
    EVICS_MASTER_CONFIG.VIRAL_THRESHOLDS.minimumViews
  );

  console.log(
    "Enabled Platforms:",
    EVICS_MASTER_CONFIG.PLATFORM_RULES.enabledPlatforms
  );

  console.log(
    "Strict People Of Color Mode:",
    EVICS_MASTER_CONFIG.RENDER_SETTINGS.strictPeopleOfColorMode
  );

  console.log(
    "Render Count:",
    EVICS_MASTER_CONFIG.RENDER_SETTINGS.renderCountPerConcept
  );

  console.log(
    "Elite Vault Grade:",
    EVICS_MASTER_CONFIG.ELITE_VAULT.minimumRenderGrade
  );

  console.log("EVICS Master Config Operational");

}

testSystem();
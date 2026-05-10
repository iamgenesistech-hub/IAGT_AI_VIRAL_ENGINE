function selectBestPlatforms(adProfile) {
  const platforms = [];

  if (adProfile.format === "UGC") platforms.push("TikTok", "Instagram Reels");
  if (adProfile.format === "Longer Education") platforms.push("YouTube");
  if (adProfile.visualQuality >= 85) platforms.push("Pinterest");
  if (adProfile.conversionIntent >= 80) platforms.push("Facebook");

  return [...new Set(platforms)];
}

module.exports = {
  selectBestPlatforms
};
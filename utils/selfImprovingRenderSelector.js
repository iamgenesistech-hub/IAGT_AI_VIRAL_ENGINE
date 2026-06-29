function selectBestRenderPattern(patterns) {
  return [...patterns].sort((a, b) => b.successScore - a.successScore)[0];
}

module.exports = { selectBestRenderPattern };

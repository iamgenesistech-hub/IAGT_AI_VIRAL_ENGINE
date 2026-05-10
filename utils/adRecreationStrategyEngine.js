function generateRecreationStrategy(ad, product) {
  return {
    sourceFormat: ad.format,
    product: product.name,
    sku: product.sku,
    strategy: `Recreate the ${ad.format} structure for ${product.name}, keeping the pacing and emotional rhythm but rewriting all words into original I AM GENESIS TECH brand voice.`,
    mustAvoid: [
      "verbatim copying",
      "competitor slogans",
      "unverified claims",
      "protected-trait targeting"
    ],
    recommendedScenes: [
      "hook scene",
      "problem scene",
      "product proof scene",
      "lifestyle transformation scene",
      "CTA scene"
    ]
  };
}

module.exports = {
  generateRecreationStrategy
};
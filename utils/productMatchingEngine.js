function matchProductsToAd(adProfile, products) {
  return products
    .map(product => {
      let score = 0;

      if (product.collections?.includes(adProfile.collection)) score += 25;
      if (product.categories?.includes(adProfile.category)) score += 25;
      if (product.goals?.some(goal => adProfile.goals.includes(goal))) score += 20;
      if (product.benefits?.some(benefit => adProfile.emotionalTriggers.includes(benefit))) score += 20;
      if (product.isBundle) score += 10;

      return {
        ...product,
        matchScore: score
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

function selectTopProductsForRendering(matches, maxProducts = 3) {
  return matches
    .filter(product => product.matchScore > 0)
    .slice(0, maxProducts);
}

module.exports = {
  matchProductsToAd,
  selectTopProductsForRendering
};
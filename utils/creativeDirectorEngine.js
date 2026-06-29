function generateCreativeDirection(input) {
  return {
    product: input.product,
    targetEmotion: input.targetEmotion,
    recommendedFormat: input.format,
    sceneDirection: `Create a ${input.format} ad for ${input.product} focused on ${input.targetEmotion}.`,
    visualTone: input.visualTone || "clinical luxury, high-tech wellness, premium transformation",
    cta: input.cta || "Shop now and begin your Genesis transformation."
  };
}

function approveCreativeDirection(direction) {
  const hasProduct = Boolean(direction.product);
  const hasEmotion = Boolean(direction.targetEmotion);
  const hasFormat = Boolean(direction.recommendedFormat);

  return hasProduct && hasEmotion && hasFormat;
}

module.exports = {
  generateCreativeDirection,
  approveCreativeDirection
};
function insertVideoIntoProductPage(product, video) {

  return {
    inserted: true,
    sku: product.sku,
    video: video.title
  };
}

module.exports = {
  insertVideoIntoProductPage
};
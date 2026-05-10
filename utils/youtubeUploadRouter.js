function routeVideoUpload(video) {

  if (video.grade >= 92) {
    return "BEST_OF_BEST_FOLDER";
  }

  return "STANDARD_RENDER_FOLDER";
}

module.exports = {
  routeVideoUpload
};
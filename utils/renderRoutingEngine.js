function determineRenderDestination(render) {

  if (render.grade >= 92) {
    return "EVICS_RENDER_FOLDER";
  }

  if (render.grade >= 80) {
    return "ACTIVE_TESTING";
  }

  return "FALLOUT_ARCHIVE";
}

module.exports = {
  determineRenderDestination
};
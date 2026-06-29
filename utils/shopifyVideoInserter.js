function insertApprovedVideo(target, video) {
  return {
    inserted: true,
    targetType: target.type,
    targetName: target.name,
    videoTitle: video.title,
    destination: target.destination
  };
}

module.exports = { insertApprovedVideo };

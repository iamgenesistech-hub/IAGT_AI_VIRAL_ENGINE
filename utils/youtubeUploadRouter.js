function routeYouTubeUpload(video) {
  return {
    videoTitle: video.title,
    upload: true,
    folder: video.grade >= 92 ? "EVICS Render Folder - Best of the Best" : "EVICS Approved Ads"
  };
}

module.exports = { routeYouTubeUpload };

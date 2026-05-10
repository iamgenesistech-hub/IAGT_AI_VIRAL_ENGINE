function reviewRender(render) {
  return {
    renderName: render.name,
    grade: render.grade,
    status: render.grade >= 85 ? "Approved" : "Needs Revision"
  };
}

module.exports = { reviewRender };

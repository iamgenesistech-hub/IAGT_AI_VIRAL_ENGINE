function approveRender(render) {
  const approved =
    render.grade >= 85 &&
    render.productFit >= 80 &&
    render.brandAlignment >= 80 &&
    render.complianceSafe === true;

  return {
    renderName: render.name,
    approved,
    status:
      render.grade >= 92 && approved ? "Best of the Best" :
      approved ? "Approved for Testing" :
      "Rejected or Needs Revision"
  };
}

module.exports = {
  approveRender
};
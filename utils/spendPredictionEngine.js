function predictSpendAction(input) {
  if (input.netProfit <= 0) return "Reduce or Pause Spend";
  if (input.profitScore >= 2000 && input.fatigueScore < 50) return "Increase Spend";
  if (input.momentumScore >= 80 && input.renderGrade >= 85) return "Controlled Spend Increase";
  return "Maintain Spend";
}

module.exports = {
  predictSpendAction
};
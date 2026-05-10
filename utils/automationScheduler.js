function runScheduledTask(taskName, cadence) {
  return {
    taskName,
    cadence,
    status: "Scheduled",
    timestamp: new Date().toISOString()
  };
}

module.exports = { runScheduledTask };

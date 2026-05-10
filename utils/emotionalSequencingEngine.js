function buildEmotionalSequence(input) {
  return {
    openingEmotion: input.openingEmotion || "curiosity",
    tensionEmotion: input.tensionEmotion || "frustration",
    proofEmotion: input.proofEmotion || "belief",
    closingEmotion: input.closingEmotion || "confidence",
    sequence: [
      "Hook with curiosity",
      "Raise the pain point",
      "Show proof or transformation",
      "Close with confidence and action"
    ]
  };
}

module.exports = {
  buildEmotionalSequence
};
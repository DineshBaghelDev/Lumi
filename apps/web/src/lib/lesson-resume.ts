export const resolveResumeBlockId = (blockIds: readonly string[], blockIndex?: number) => {
  if (!blockIds.length || typeof blockIndex !== "number" || blockIndex <= 0) {
    return null;
  }

  return blockIds[Math.min(blockIndex, blockIds.length - 1)] ?? null;
};

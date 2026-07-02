export function parseLowStockThreshold(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

export function getLowStockState(stock, threshold, type = "product") {
  const normalizedStock = Number(stock) || 0;
  const normalizedThreshold = parseLowStockThreshold(threshold);

  if (normalizedThreshold === null || normalizedThreshold < 0) {
    return null;
  }

  if (normalizedStock <= 0 || normalizedStock > normalizedThreshold) {
    return null;
  }

  const label = normalizedStock === 1
    ? "Resta 1"
    : `Restam ${normalizedStock}`;

  return {
    enabled: true,
    stock: normalizedStock,
    threshold: normalizedThreshold,
    label,
    type,
  };
}

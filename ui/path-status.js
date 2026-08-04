export function isAbnormalInspectionStatus(status) {
  return status === "missing" || status === "denied" || status === "invalid";
}

export function collectAbnormalPathIds(paths = []) {
  return new Set(
    paths
      .filter((item) => isAbnormalInspectionStatus(item.inspection?.status))
      .map((item) => item.id),
  );
}

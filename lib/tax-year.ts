export function getTaxYearStart(): Date {
  const now = new Date();
  const year =
    now.getMonth() >= 3 && now.getDate() >= 6
      ? now.getFullYear()
      : now.getFullYear() - 1;
  return new Date(Date.UTC(year, 3, 6));
}

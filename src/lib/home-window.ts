// Returns the signed-in person's current local week and calendar month.
export function homeWindow(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const weekday = start.getDay();
  start.setDate(start.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return { weekStartMs: start.getTime(), weekEndMs: end.getTime(), month };
}

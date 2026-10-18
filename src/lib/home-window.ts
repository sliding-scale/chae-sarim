// Returns the current local week, starting Sunday, and the calendar month.
export function homeWindow(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return { weekStartMs: start.getTime(), weekEndMs: end.getTime(), month };
}

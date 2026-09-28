export const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

// Timestamp on the selected day, using the current time of day
export const timestampForDay = (day: Date) => {
  const d = new Date(day);
  const now = new Date();
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
  return d.getTime();
};

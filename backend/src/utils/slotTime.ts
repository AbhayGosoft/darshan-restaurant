/** DB stores times (arrival, opening hours) as 24h "HH:mm"; the customer API uses "h:mm AM/PM" throughout. */
export const to12Hour = (time24: string): string => {
  const [hourStr, minuteStr] = time24.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
};

export const to24Hour = (time12: string): string => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time12.trim());
  if (!match) throw new Error(`Invalid time format: ${time12}`);
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]!.toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

export const isValidTime12 = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  return Boolean(match) && Number(match![1]) >= 1 && Number(match![1]) <= 12 && Number(match![2]) <= 59;
};

/** 24h "HH:mm" with a real hour/minute, e.g. "09:00" or "23:30". */
export const isValidTime24 = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** "HH:mm" ↔ minutes since midnight. */
export const toMinutes = (time24: string) => {
  const [hour, minute] = time24.split(":").map(Number);
  return hour! * 60 + minute!;
};
export const fromMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

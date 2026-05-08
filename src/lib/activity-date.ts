export type ActivityDateSettings = {
  restrictActivityDate: boolean;
};

const activityDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
});

export function getActivityDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  return activityDateFormatter.format(date);
}

export function getAllowedActivityDateBounds(settings: ActivityDateSettings) {
  if (!settings.restrictActivityDate) {
    return {
      allowedDates: [] as string[],
      min: "",
      max: "",
    };
  }

  const previousDate = getActivityDateString(-1);
  const currentDate = getActivityDateString(0);

  return {
    allowedDates: [previousDate, currentDate],
    min: previousDate,
    max: currentDate,
  };
}

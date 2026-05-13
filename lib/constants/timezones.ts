/** Common IANA timezones for retail / POS (Philippines-first, plus frequent options). */
export const APP_TIMEZONE_OPTIONS = [
  { value: "Asia/Manila", label: "Asia/Manila — Philippines" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "Asia/Seoul", label: "Asia/Seoul" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok" },
  { value: "Asia/Jakarta", label: "Asia/Jakarta" },
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New York (ET)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PT)" },
  { value: "UTC", label: "UTC" },
] as const;

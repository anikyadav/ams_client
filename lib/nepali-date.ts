import NepaliDate from "nepali-date-converter";

const pad = (value: number) => String(value).padStart(2, "0");
export function bsToAd(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Enter a BS date as YYYY-MM-DD");
  const [year, month, day] = value.split("-").map(Number);
  const date = new NepaliDate(year, month - 1, day);
  const bs = date.getBS();
  if (bs.year !== year || bs.month !== month - 1 || bs.date !== day)
    throw new Error("Invalid Nepali date");
  const ad = date.getAD();
  return `${ad.year}-${pad(ad.month + 1)}-${pad(ad.date)}`;
}

// Date-only values retain their calendar day; timestamps use Nepal's local day.
export function adToBs(value: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value));
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new NepaliDate(new Date(year, month - 1, day, 12)).format(
    "YYYY-MM-DD",
  );
}

export function fiscalYearLabel(year: { startDate: string | null }): string {
  if (!year.startDate) return "Unassigned historical data";
  const start = Number(adToBs(year.startDate.slice(0, 10)).slice(0, 4));
  return `FY ${start}/${String(start + 1).slice(-2)}`;
}

export function currentBsFiscalYear(): number {
  const [year, month] = adToBs(new Date().toISOString()).split("-").map(Number);
  return month >= 4 ? year : year - 1;
}

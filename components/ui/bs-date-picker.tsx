"use client";

import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import NepaliDate, { dateConfigMap } from "nepali-date-converter";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { adToBs, bsToAd } from "@/lib/nepali-date";
import { Button } from "./button";
import { Input } from "./input";
import { NativeSelect } from "./native-select";

const months = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
const years = Object.keys(dateConfigMap).map(Number).sort((a, b) => a - b);
const pad = (value: number) => String(value).padStart(2, "0");

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "onBlur"> & {
  value?: string;
  onChange: (value: string) => void;
  label: string;
  onBlur?: () => void;
};

export function BsDatePicker({ value = "", onChange, onBlur, label, ...inputProps }: Props) {
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) panel.current?.scrollIntoView({ block: "nearest" });
  }, [open]);
  const [view, setView] = useState(() => adToBs(new Date().toISOString()).slice(0, 7));
  const [year, month] = view.split("-").map(Number);
  const first = new NepaliDate(year, month - 1, 1);
  const days = Object.values(dateConfigMap[String(year)])[month - 1];
  const choose = (date: string) => {
    onChange(date);
    onBlur?.();
    setOpen(false);
    trigger.current?.focus();
  };
  const move = (offset: number) => {
    const index = year * 12 + month - 1 + offset;
    setView(`${Math.floor(index / 12)}-${pad(index % 12 + 1)}`);
  };
  return <div className="space-y-2">
    <div className="relative">
      <Input {...inputProps} value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} placeholder="YYYY-MM-DD" inputMode="numeric" className="pr-12" />
      <Button ref={trigger} type="button" variant="ghost" size="icon" disabled={inputProps.disabled} className="absolute right-0 top-0" aria-label={`Choose ${label}`} aria-expanded={open} aria-controls={panelId} onClick={() => {
        if (!open) {
          let initial = adToBs(new Date().toISOString());
          try { bsToAd(value); initial = value; } catch { /* Open at today for an empty or invalid typed date. */ }
          setView(initial.slice(0, 7));
        }
        setOpen(!open);
      }}><CalendarDays className="size-4" /></Button>
    </div>
    {open && <div ref={panel} id={panelId} role="region" aria-label={`${label} calendar`} className="scroll-mb-24 rounded-xl border bg-card p-2 shadow-sm" onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    }}>
      <div className="mb-2 flex gap-1">
        <NativeSelect aria-label={`${label} month`} value={month} onChange={(event) => setView(`${year}-${pad(Number(event.target.value))}`)}>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</NativeSelect>
        <NativeSelect aria-label={`${label} year`} className="w-24 shrink-0" value={year} onChange={(event) => setView(`${event.target.value}-${pad(month)}`)}>{years.map((item) => <option key={item} value={item}>{item} BS</option>)}</NativeSelect>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Previous BS month" disabled={year === years[0] && month === 1} onClick={() => move(-1)}><ChevronLeft /></Button>
        <span className="text-xs font-medium" aria-live="polite">{months[month - 1]} {year}</span>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Next BS month" disabled={year === years[years.length - 1] && month === 12} onClick={() => move(1)}><ChevronRight /></Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-1 text-xs text-muted-foreground">{day}</span>)}
        {Array.from({ length: first.getDay() }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const date = `${view}-${pad(index + 1)}`;
          return <button type="button" key={date} aria-label={`${date} BS`} aria-pressed={value === date} className={`min-h-11 rounded-md text-sm focus-visible:outline-2 focus-visible:outline-ring ${value === date ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`} onClick={() => choose(date)}>{index + 1}</button>;
        })}
      </div>
      <div className="mt-2 flex justify-between border-t pt-2"><Button type="button" variant="ghost" size="sm" onClick={() => choose(adToBs(new Date().toISOString()))}>Today</Button><Button type="button" variant="ghost" size="sm" onClick={() => choose("")}>Clear date</Button></div>
    </div>}
  </div>;
}

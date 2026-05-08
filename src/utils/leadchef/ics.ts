/**
 * Geração de ficheiros .ics (RFC 5545) para compromissos LeadChef.
 */
import { downloadFile } from "./csv";

export interface ICSEvent {
  uid?: string;
  title: string;
  description?: string;
  location?: string;
  startISO: string;
  endISO?: string;
  durationMinutes?: number;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toICSDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeText(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildICSCalendarEvent(event: ICSEvent): string {
  const uid = event.uid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}@leadchef`;
  const start = toICSDate(event.startISO);
  let endISO = event.endISO;
  if (!endISO) {
    const minutes = event.durationMinutes ?? 60;
    endISO = new Date(new Date(event.startISO).getTime() + minutes * 60_000).toISOString();
  }
  const end = toICSDate(endISO);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FastCRM//LeadChef//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICSFile(filename: string, event: ICSEvent) {
  const ics = buildICSCalendarEvent(event);
  downloadFile(filename.endsWith(".ics") ? filename : `${filename}.ics`, ics, "text/calendar;charset=utf-8");
}

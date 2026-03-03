"use client";

import { useState, useEffect } from "react";
import { format, subDays, parseISO, startOfMonth } from "date-fns";
import { CalendarDays, AlertCircle, CalendarX, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AlertCard, type RegressionAlertWithDetails } from "@/components/alert-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AlertsApiResponse } from "@/app/api/alerts/route";

export function AlertsDatePicker() {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [alertDates, setAlertDates] = useState<Date[]>([]);
  const [datesLoading, setDatesLoading] = useState(true);
  const [alerts, setAlerts] = useState<RegressionAlertWithDetails[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const calendarStartMonth = startOfMonth(thirtyDaysAgo);

  useEffect(() => {
    queueMicrotask(() => {
      setDatesLoading(true);
    });

    fetch(`/api/alerts/dates`)
      .then((r) => r.json())
      .then((data: { dates: string[] }) => {
        setAlertDates(data.dates.map((d) => parseISO(d)));
      })
      .catch(() => {
        setAlertDates([]);
      })
      .finally(() => setDatesLoading(false));
  }, []);

  // Fetch alerts for the selected date
  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    queueMicrotask(() => {
      setAlertsLoading(true);
      setAlertsError(null);
    });

    const params = new URLSearchParams({
      date: format(selectedDate, "yyyy-MM-dd"),
      limit: "50",
    });

    fetch(`/api/alerts?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch alerts");
        return r.json();
      })
      .then((data: AlertsApiResponse) => {
        setAlerts(data.alerts as RegressionAlertWithDetails[]);
      })
      .catch(() => {
        setAlertsError("Could not load alerts for this date. Please try again.");
      })
      .finally(() => setAlertsLoading(false));
  }, [selectedDate]);

  const hasAlertsOnSelected =
    selectedDate &&
    alertDates.some(
      (d) => format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"),
    );

  function handleSelect(date: Date | undefined) {
    setSelectedDate(date);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Popover trigger */}
      <div className="flex items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[220px] justify-start gap-2 font-normal",
                !selectedDate && "text-muted-foreground",
              )}
            >
              <CalendarDays className="h-4 w-4 shrink-0" />
              {selectedDate
                ? format(selectedDate, "MMMM d, yyyy")
                : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {datesLoading ? (
              <div className="p-3">
                <Skeleton className="h-[280px] w-[252px] rounded-md" />
              </div>
            ) : (
              <>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSelect}
                  defaultMonth={today}
                  startMonth={calendarStartMonth}
                  endMonth={today}
                  disabled={(d) => d > today || d < thirtyDaysAgo}
                  modifiers={{ hasAlerts: alertDates }}
                  modifiersClassNames={{ hasAlerts: "rdp-day_hasAlerts" }}
                />
                <p className="text-xs text-muted-foreground text-center pb-3 px-3 tracking-tighter">
                  Orange dots indicate days with alerts
                </p>
              </>
            )}
          </PopoverContent>
        </Popover>

        {selectedDate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(undefined)}
            className="text-muted-foreground gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Alert results */}
      {!selectedDate ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground tracking-tighter">
            Select a day to view alerts for that date
          </p>
        </div>
      ) : alertsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
          ))}
        </div>
      ) : alertsError ? (
        <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{alertsError}</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <CalendarX className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold tracking-tighter">
            No alerts on {format(selectedDate, "MMMM d, yyyy")}
          </p>
          <p className="text-sm text-muted-foreground tracking-tight">
            {hasAlertsOnSelected
              ? "Try adjusting your severity filter."
              : "No performance regressions were detected on this day."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground font-semibold tracking-tighter">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""} on{" "}
            {format(selectedDate, "MMMM d, yyyy")}
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

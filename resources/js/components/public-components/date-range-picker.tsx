"use client";

import { cn } from "@/lib/utils";
import { DateInput, dateInputStyle } from "@/components/ui/datefield-rac";
import { CalendarIcon } from "lucide-react";
import { Button, DateRangePicker, Dialog, Group, Popover } from "react-aria-components";
import { RangeCalendar } from "../ui/calendar-rac";
import { useDateRange } from "@/store/useDateRange";
import { parseDate, getLocalTimeZone } from "@internationalized/date";
import { addDays, format } from "date-fns";
import { useEffect } from "react";

export default function DateRangePickernew() {
  // Get the date range from the store
  const { dateRange, setDateRange } = useDateRange();
  
  // Set default date range when component mounts (today - 15 days)
  useEffect(() => {
    const today = new Date();
    const fifteenDaysAgo = addDays(today, -15);
    
    // Only set if not already set
    if (!dateRange.from || !dateRange.to) {
      setDateRange({
        from: fifteenDaysAgo,
        to: today
      });
    }
  }, []);
  
  // Convert JS Date to Internationalized Date for react-aria
  const value = dateRange.from && dateRange.to ? {
    start: parseDate(format(dateRange.from, 'yyyy-MM-dd')),
    end: parseDate(format(dateRange.to, 'yyyy-MM-dd'))
  } : undefined;
  
  return (
    <DateRangePicker 
      className="space-y-2"
      value={value}
      onChange={(value) => {
        // Only update if we have both start and end dates
        if (value && value.start && value.end) {
          // Convert back to JS Date for our store
          setDateRange({
            from: value.start.toDate(getLocalTimeZone()),
            to: value.end.toDate(getLocalTimeZone())
          });
        }
      }}
    >
      <div className="flex">
        <Group className={cn(dateInputStyle, "pe-9")}>
          <DateInput 
            slot="start" 
            unstyled 
          />
          <span aria-hidden="true" className="px-2 text-muted-foreground/70">
            -
          </span>
          <DateInput 
            slot="end" 
            unstyled 
          />
        </Group>
        <Button className="z-10 -me-px -ms-9 flex w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus-visible:outline-none data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70">
          <CalendarIcon size={16} strokeWidth={2} />
        </Button>
      </div>
      <Popover
        className="z-50 rounded-lg border border-border bg-background text-popover-foreground shadow-lg shadow-black/5 outline-none data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0 data-[entering]:zoom-in-95 data-[exiting]:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2"
        offset={4}
      >
        <Dialog className="max-h-[inherit] overflow-auto p-2">
          <RangeCalendar />
        </Dialog>
      </Popover>
      
    </DateRangePicker>
  );
}


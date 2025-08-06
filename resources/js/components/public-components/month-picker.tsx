import { CalendarIcon } from "lucide-react";
import { Button } from "../ui/button";
import { MonthPicker } from "../ui/monthpicker";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useMonthPicker } from '@/store/useMonthPicker';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function PickerMonth() {
    const { selectedMonth, setSelectedMonth } = useMonthPicker();
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[180px] justify-start text-left font-normal", !selectedMonth && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedMonth ? format(selectedMonth, "MMM yyyy") : <span>Pick a month</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <MonthPicker onMonthSelect={setSelectedMonth} selectedMonth={selectedMonth} />
            </PopoverContent>
        </Popover>
    );
}   
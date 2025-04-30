import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      captionLayout={props.captionLayout || "buttons"}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

// Para usar em casos onde precisamos de seleção de data antiga mais limpa
function YearMonthSelector({ 
  month, 
  onMonthChange, 
  fromYear = 1980,
  toYear = new Date().getFullYear() + 5,
}: { 
  month: Date; 
  onMonthChange: (date: Date) => void;
  fromYear?: number;
  toYear?: number;
}) {
  const years = React.useMemo(() => {
    return Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);
  }, [fromYear, toYear]);

  const months = React.useMemo(() => {
    return [
      "Janeiro", "Fevereiro", "Março", "Abril",
      "Maio", "Junho", "Julho", "Agosto",
      "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
  }, []);

  const handleYearChange = React.useCallback((value: string) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(value));
    onMonthChange(newDate);
  }, [month, onMonthChange]);

  const handleMonthChange = React.useCallback((value: string) => {
    const newDate = new Date(month);
    newDate.setMonth(parseInt(value));
    onMonthChange(newDate);
  }, [month, onMonthChange]);

  return (
    <div className="flex items-center justify-between space-x-2 mb-2">
      <Select
        value={month.getMonth().toString()}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="w-[120px] h-8">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent position="popper">
          {months.map((month, index) => (
            <SelectItem key={index} value={index.toString()}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={month.getFullYear().toString()}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="w-[90px] h-8">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-[200px]">
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Calendário com seletor de ano/mês limpo e minimalista
function DatePickerWithYearNavigation({
  date,
  setDate,
  fromYear = 1980,
  toYear,
  ...props
}: {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  fromYear?: number;
  toYear?: number;
} & Omit<CalendarProps, "selected" | "onSelect">) {
  const [month, setMonth] = React.useState<Date>(date || new Date());
  
  if (!toYear) {
    toYear = new Date().getFullYear() + 5;
  }

  return (
    <div>
      <YearMonthSelector 
        month={month} 
        onMonthChange={setMonth} 
        fromYear={fromYear}
        toYear={toYear}
      />
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        month={month}
        onMonthChange={setMonth}
        disabled={(date) => 
          date > new Date(toYear, 11, 31) || 
          date < new Date(fromYear, 0, 1)
        }
        {...props}
      />
    </div>
  );
}

export { Calendar, DatePickerWithYearNavigation }

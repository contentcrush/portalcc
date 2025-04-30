import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DayPicker } from "react-day-picker"

interface DatePickerWithYearNavigationProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  fromYear?: number
  toYear?: number
}

// Custom Caption component that adds year and month dropdowns
function YearNavigation({
  displayMonth,
  onMonthChange,
  fromYear = 1900,
  toYear = new Date().getFullYear() + 1
}: {
  displayMonth: Date;
  onMonthChange: (date: Date) => void;
  fromYear?: number;
  toYear?: number;
}) {
  const years = React.useMemo(() => {
    const yearRange = []
    for (let year = fromYear; year <= toYear; year++) {
      yearRange.push(year)
    }
    return yearRange
  }, [fromYear, toYear])

  const months = [
    { value: 0, label: "Janeiro" },
    { value: 1, label: "Fevereiro" },
    { value: 2, label: "Março" },
    { value: 3, label: "Abril" },
    { value: 4, label: "Maio" },
    { value: 5, label: "Junho" },
    { value: 6, label: "Julho" },
    { value: 7, label: "Agosto" },
    { value: 8, label: "Setembro" },
    { value: 9, label: "Outubro" },
    { value: 10, label: "Novembro" },
    { value: 11, label: "Dezembro" },
  ]

  const handleYearChange = (year: string) => {
    const newDate = new Date(displayMonth)
    newDate.setFullYear(parseInt(year))
    onMonthChange(newDate)
  }

  const handleMonthChange = (month: string) => {
    const newDate = new Date(displayMonth)
    newDate.setMonth(parseInt(month))
    onMonthChange(newDate)
  }

  return (
    <div className="flex gap-1 items-center justify-center py-1">
      <Select
        value={displayMonth.getMonth().toString()}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="h-8 w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value.toString()}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={displayMonth.getFullYear().toString()}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="h-8 w-[90px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Component that provides a calendar with year navigation
export function DatePickerWithYearNavigation({
  date,
  setDate,
  fromYear = 1900,
  toYear = new Date().getFullYear() + 1
}: DatePickerWithYearNavigationProps) {
  const [month, setMonth] = React.useState<Date>(date || new Date())

  return (
    <div className="flex flex-col">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        month={month}
        onMonthChange={setMonth}
        captionLayout="buttons"
        components={{
          Caption: ({ displayMonth }) => (
            <YearNavigation
              displayMonth={displayMonth}
              onMonthChange={setMonth}
              fromYear={fromYear}
              toYear={toYear}
            />
          )
        }}
      />
    </div>
  )
}
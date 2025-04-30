"use client"

import * as React from "react"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { pt, ptBR } from 'date-fns/locale'

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

// Componente personalizado de calendário com navegação por ano
export type DatePickerProps = {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  fromYear?: number;
  toYear?: number;
}

export function DatePickerWithYearNavigation({
  date,
  setDate,
  fromYear = 1970,
  toYear = new Date().getFullYear() + 5
}: DatePickerProps) {
  const [selectedYear, setSelectedYear] = useState<number>(
    date?.getFullYear() || new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    date?.getMonth() || new Date().getMonth()
  );

  // Calcula o mês e ano atuais para o calendário
  const currentMonth = new Date();
  currentMonth.setMonth(selectedMonth);
  currentMonth.setFullYear(selectedYear);

  // Gera array de anos para seleção
  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i
  );

  // Atualiza o mês selecionado quando o calendário navega
  const handleMonthChange = (newMonth: Date) => {
    setSelectedYear(newMonth.getFullYear());
    setSelectedMonth(newMonth.getMonth());
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={selectedMonth.toString()}
          onValueChange={(value) => {
            setSelectedMonth(parseInt(value));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Janeiro</SelectItem>
            <SelectItem value="1">Fevereiro</SelectItem>
            <SelectItem value="2">Março</SelectItem>
            <SelectItem value="3">Abril</SelectItem>
            <SelectItem value="4">Maio</SelectItem>
            <SelectItem value="5">Junho</SelectItem>
            <SelectItem value="6">Julho</SelectItem>
            <SelectItem value="7">Agosto</SelectItem>
            <SelectItem value="8">Setembro</SelectItem>
            <SelectItem value="9">Outubro</SelectItem>
            <SelectItem value="10">Novembro</SelectItem>
            <SelectItem value="11">Dezembro</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => {
            setSelectedYear(parseInt(value));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        month={currentMonth}
        onMonthChange={handleMonthChange}
        locale={ptBR}
      />
    </div>
  );
}

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
      locale={pt}
      weekStartsOn={1} // Iniciando a semana na segunda-feira (padrão europeu/brasileiro)
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
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
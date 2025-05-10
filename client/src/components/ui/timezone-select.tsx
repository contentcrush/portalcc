import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

// Lista de fusos horários principais organizados por região
const timezones = [
  // Brasil e América do Sul
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)", group: "Brasil" },
  { value: "America/Manaus", label: "Manaus (GMT-4)", group: "Brasil" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)", group: "Brasil" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)", group: "América do Sul" },
  { value: "America/Santiago", label: "Santiago (GMT-4)", group: "América do Sul" },
  
  // América do Norte e Central
  { value: "America/New_York", label: "Nova York (GMT-5/GMT-4)", group: "América do Norte" },
  { value: "America/Chicago", label: "Chicago (GMT-6/GMT-5)", group: "América do Norte" },
  { value: "America/Denver", label: "Denver (GMT-7/GMT-6)", group: "América do Norte" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8/GMT-7)", group: "América do Norte" },
  { value: "America/Mexico_City", label: "Cidade do México (GMT-6/GMT-5)", group: "América do Norte" },
  
  // Europa
  { value: "Europe/Lisbon", label: "Lisboa (GMT+0/GMT+1)", group: "Europa" },
  { value: "Europe/London", label: "Londres (GMT+0/GMT+1)", group: "Europa" },
  { value: "Europe/Paris", label: "Paris (GMT+1/GMT+2)", group: "Europa" },
  { value: "Europe/Berlin", label: "Berlim (GMT+1/GMT+2)", group: "Europa" },
  { value: "Europe/Moscow", label: "Moscou (GMT+3)", group: "Europa" },
  
  // Ásia e Oceania
  { value: "Asia/Dubai", label: "Dubai (GMT+4)", group: "Ásia" },
  { value: "Asia/Tokyo", label: "Tóquio (GMT+9)", group: "Ásia" },
  { value: "Asia/Shanghai", label: "Xangai (GMT+8)", group: "Ásia" },
  { value: "Asia/Singapore", label: "Singapura (GMT+8)", group: "Ásia" },
  { value: "Australia/Sydney", label: "Sydney (GMT+10/GMT+11)", group: "Oceania" },
  
  // UTC
  { value: "UTC", label: "UTC (GMT+0)", group: "UTC" },
];

// Agrupando fusos horários por região
const timezoneGroups = timezones.reduce((groups, timezone) => {
  const group = timezone.group;
  if (!groups[group]) {
    groups[group] = [];
  }
  groups[group].push(timezone);
  return groups;
}, {} as Record<string, typeof timezones>);

export function TimezoneSelect({ value, onChange, label }: TimezoneSelectProps) {
  const [selectedTimezone, setSelectedTimezone] = useState(value || "America/Sao_Paulo");
  
  useEffect(() => {
    if (value) {
      setSelectedTimezone(value);
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    setSelectedTimezone(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor="timezone-select">{label}</Label>}
      
      <Select value={selectedTimezone} onValueChange={handleChange}>
        <SelectTrigger id="timezone-select" className="w-full">
          <SelectValue placeholder="Selecione o fuso horário" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(timezoneGroups).map(([groupName, groupTimezones]) => (
            <SelectGroup key={groupName}>
              <SelectLabel>{groupName}</SelectLabel>
              {groupTimezones.map((timezone) => (
                <SelectItem key={timezone.value} value={timezone.value}>
                  {timezone.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
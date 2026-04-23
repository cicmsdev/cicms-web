
"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface CalendarProps {
  mode?: "single"; // Add this line
  selected?: Date;
  onSelect?: (date?: Date) => void;
  disabled?: (date: Date) => boolean;
  initialFocus?: boolean;
}

export function Calendar({
  mode = "single", // default value
  selected,
  onSelect,
  disabled,
  initialFocus,
}: CalendarProps) {
  return (
    <DayPicker
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      defaultMonth={selected}
      modifiersClassNames={{
        selected: "bg-primary text-white",
        today: "text-primary",
      }}
      className="p-2"
    />
  );
}

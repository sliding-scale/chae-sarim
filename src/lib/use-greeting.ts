"use client";

import { useEffect, useState } from "react";

// Returns morning, afternoon, or evening for a clock time.
function timeOfDay(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Returns a time-of-day greeting that includes the signed-in person's name.
export function useGreeting(name: string) {
  const first = name.split(" ")[0] || "there";
  const [part, setPart] = useState("Hello");

  useEffect(() => {
    setPart(timeOfDay(new Date()));
  }, []);

  return `${part}, ${first}`;
}

import type { GroupLabel } from "@/db/schema";

export const STAY_GROUP_LABELS = ["Nick Friends", "Nikki Friends", "Nick Fam"] as const satisfies readonly GroupLabel[];

export const AIRLINES = [
  ["AA", "American Airlines"],
  ["AC", "Air Canada"],
  ["AS", "Alaska Airlines"],
  ["B6", "JetBlue Airways"],
  ["BA", "British Airways"],
  ["DL", "Delta Air Lines"],
  ["F9", "Frontier Airlines"],
  ["G4", "Allegiant Air"],
  ["NK", "Spirit Airlines"],
  ["MX", "Breeze Airways"],
  ["SY", "Sun Country Airlines"],
  ["UA", "United Airlines"],
  ["WN", "Southwest Airlines"],
  ["OTHER", "Other airline"],
] as const;

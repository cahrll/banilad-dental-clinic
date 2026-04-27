import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function firstName(fullName: string): string {
  return fullName.split(/\s+/)[0] ?? fullName;
}

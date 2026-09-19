import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The only way class names are composed in this project (R1.1).
 *
 * clsx flattens conditionals and arrays; twMerge resolves Tailwind conflicts
 * so a later class wins over an earlier one of the same kind. The edit engine
 * (Step 4) mutates the *first* argument at every call site, which is why R1.2
 * requires it to be a string literal even when empty.
 *
 * Lives at lib/utils.ts because that is where shadcn/ui expects to find it.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

import { type ReactNode } from "react";
import { SelectTrigger } from "../ui/select";

export function LanguageSelectorTrigger({ children }: { children: ReactNode }) {
  return <SelectTrigger className="w-30">{children}</SelectTrigger>;
}

import { Moon, Sun } from "lucide-react";
import { type ReactNode } from "react";
import { Label } from "../ui/label";
import { cn } from "../../utils";

export function DarkModeOuterDiv({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function DarkModeLabel({ children }: { children: ReactNode }) {
  return (
    <Label
      className={cn(
        "h-7.5 bg-muted relative m-0 block w-14 cursor-pointer rounded-full transition-colors duration-300 ease-in-out",
      )}
    >
      {children}
    </Label>
  );
}

export function DarkModeCheckboxInput({ onChange }: { onChange: () => void }) {
  return (
    <input
      type="checkbox"
      onChange={onChange}
      className="absolute top-0 z-50 m-0 h-full w-full cursor-pointer opacity-0"
    />
  );
}

export function DarkModeKnob({
  isInLightMode,
  children,
}: {
  isInLightMode: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "border-border absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-md transition-all duration-300 ease-in-out",
        {
          "ltr:left-0.75 ltr:translate-x-0 rtl:right-0.75 rtl:translate-x-0":
            isInLightMode,
          "ltr:right-0.75 rtl:left-0.75": !isInLightMode,
        },
      )}
    >
      {children}
    </span>
  );
}

const iconSlotClass =
  "absolute inset-0 flex items-center justify-center transition-opacity ease-in-out duration-300";

export function ModeIconLightSlot({ isVisible }: { isVisible: boolean }) {
  return (
    <span className={cn(iconSlotClass, isVisible ? "opacity-100" : "opacity-0")}>
      <Sun className="size-4 fill-amber-500 stroke-amber-500" />
    </span>
  );
}

export function ModeIconDarkSlot({ isVisible }: { isVisible: boolean }) {
  return (
    <span className={cn(iconSlotClass, isVisible ? "opacity-100" : "opacity-0")}>
      <Moon className="size-4 fill-slate-600 stroke-slate-600" />
    </span>
  );
}

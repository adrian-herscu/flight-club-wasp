import { type ReactNode } from "react";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectTrigger, SelectValue } from "../ui/select";

type LabeledSelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  children: ReactNode;
  className?: string;
};

const LabeledSelectField = ({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  children,
  className = "space-y-2",
}: LabeledSelectFieldProps) => {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
};

export default LabeledSelectField;

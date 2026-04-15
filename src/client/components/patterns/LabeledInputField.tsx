import { Input } from "../ui/input";
import { Label } from "../ui/label";

type LabeledInputFieldProps = {
  id: string;
  label: string;
  value: string | number;
  onChange?: (value: string) => void;
  type?: "text" | "number" | "email" | "url" | "tel" | "date";
  min?: number;
  max?: number;
  maxLength?: number;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
};

const LabeledInputField = ({
  id,
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  maxLength,
  disabled,
  placeholder,
  required,
}: LabeledInputFieldProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        type={type}
        min={min}
        max={max}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
};

export default LabeledInputField;

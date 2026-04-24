"use client";

import { CheckCircle2, Eye, EyeOff, LockKeyhole, XCircle } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { ControllerRenderProps, FieldPath, FieldValues } from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import { getPasswordChecks } from "@/lib/validation/auth";

type PasswordFieldProps<TFieldValues extends FieldValues> = {
  autoComplete: string;
  description?: string;
  error?: { message?: string };
  field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>;
  label: string;
  placeholder: string;
  showRequirements?: boolean;
};

export function PasswordField<TFieldValues extends FieldValues>({
  autoComplete,
  description,
  error,
  field,
  label,
  placeholder,
  showRequirements = false,
}: PasswordFieldProps<TFieldValues>) {
  const id = useId();
  const [isVisible, setIsVisible] = useState(false);
  const [hasFocused, setHasFocused] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const value = typeof field.value === "string" ? field.value : "";
  const checks = showRequirements ? getPasswordChecks(value) : [];
  const allChecksPassed = useMemo(
    () => checks.every((check) => check.passed),
    [checks],
  );
  const isOpen =
    showRequirements && (isFocused || (hasFocused && !allChecksPassed));

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover open={isOpen}>
        <PopoverAnchor asChild>
          <div>
            <InputGroup>
              <InputGroupAddon>
                <LockKeyhole />
              </InputGroupAddon>
              <InputGroupInput
                {...field}
                id={id}
                aria-invalid={error ? true : undefined}
                autoComplete={autoComplete}
                placeholder={placeholder}
                type={isVisible ? "text" : "password"}
                onBlur={() => {
                  field.onBlur();
                  setIsFocused(false);
                }}
                onFocus={() => {
                  setHasFocused(true);
                  setIsFocused(true);
                }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label={isVisible ? "Hide password" : "Show password"}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => setIsVisible((current) => !current)}
                  size="icon-sm"
                  variant="ghost"
                >
                  {isVisible ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </PopoverAnchor>
        {showRequirements ? (
          <PopoverContent
            align="start"
            className="w-80"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
            }}
            side="right"
          >
            <PopoverHeader>
              <PopoverTitle>Password requirements</PopoverTitle>
              <PopoverDescription>
                Your password needs to satisfy all of these rules.
              </PopoverDescription>
            </PopoverHeader>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              {checks.map((check) => (
                <div key={check.id} className="flex items-center gap-2">
                  {check.passed ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : (
                    <XCircle className="size-4 text-red-600" />
                  )}
                  <span
                    className={check.passed ? "text-green-600" : "text-red-600"}
                  >
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </PopoverContent>
        ) : null}
      </Popover>
      {showRequirements ? null : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
      {!showRequirements && error ? <FieldError errors={[error]} /> : null}
    </Field>
  );
}

"use client";

import { useId, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

export function FormField<T extends FieldValues, P extends FieldPath<T>>({
  control,
  name,
  label,
  hint,
  children,
}: {
  control: Control<T>;
  name: P;
  label?: string;
  hint?: string;
  children: (
    field: ControllerRenderProps<T, P> & {
      id: string;
      "aria-invalid": boolean;
      "aria-describedby": string;
    },
  ) => ReactNode;
}) {
  const id = useId();
  return (
    <Controller<T, P>
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field>
          <FieldContent>
            {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
            {children({
              ...field,
              id,
              "aria-invalid": !!fieldState.error,
              "aria-describedby": `${id}-hint ${id}-error`,
            })}
            {hint ? (
              <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
            ) : null}
            <FieldError id={`${id}-error`} errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  );
}

import { NextResponse } from "next/server";

type ValidationError = { field: string; message: string };

export function validateString(
  value: unknown,
  field: string,
  opts?: { maxLength?: number; required?: boolean }
): ValidationError | null {
  if (opts?.required && (value === undefined || value === null || value === "")) {
    return { field, message: `${field} is required` };
  }
  if (value !== undefined && value !== null && value !== "") {
    if (typeof value !== "string") return { field, message: `${field} must be a string` };
    if (opts?.maxLength && value.length > opts.maxLength)
      return { field, message: `${field} must be under ${opts.maxLength} characters` };
  }
  return null;
}

export function validateEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: T[]
): ValidationError | null {
  if (value !== undefined && value !== null && !allowed.includes(value as T)) {
    return { field, message: `${field} must be one of: ${allowed.join(", ")}` };
  }
  return null;
}

export function validateNumber(
  value: unknown,
  field: string,
  opts?: { min?: number; max?: number }
): ValidationError | null {
  if (value !== undefined && value !== null) {
    if (typeof value !== "number" || isNaN(value))
      return { field, message: `${field} must be a number` };
    if (opts?.min !== undefined && value < opts.min)
      return { field, message: `${field} must be at least ${opts.min}` };
    if (opts?.max !== undefined && value > opts.max)
      return { field, message: `${field} must be at most ${opts.max}` };
  }
  return null;
}

export function validationFail(
  errors: (ValidationError | null)[]
): NextResponse | null {
  const actual = errors.filter(Boolean) as ValidationError[];
  if (actual.length === 0) return null;
  return NextResponse.json(
    { error: actual[0].message, errors: actual },
    { status: 400 }
  );
}

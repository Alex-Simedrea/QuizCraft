import isEmail from "validator/lib/isEmail";
import isStrongPassword from "validator/lib/isStrongPassword";
import { z } from "zod";

const MAX_BCRYPT_BYTES = 72;

function normalizePersonalName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

const personalNameSchema = z
  .string()
  .transform(normalizePersonalName)
  .refine((value) => value.length >= 2, {
    message: "Must be at least 2 characters long.",
  })
  .refine((value) => value.length <= 80, {
    message: "Must be 80 characters or fewer.",
  });

const emailSchema = z
  .string()
  .transform(normalizeEmail)
  .superRefine((value, context) => {
    if (value.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required.",
      });
      return;
    }

    if (value.length > 255) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email must be 255 characters or fewer.",
      });
    }

    if (!isEmail(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email address.",
      });
    }
  });

export const passwordSchema = z.string().superRefine((value, context) => {
  if (value.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password is required.",
    });
    return;
  }

  if (value !== value.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password cannot start or end with whitespace.",
    });
  }

  if (
    !isStrongPassword(value, {
      minLength: 12,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
      returnScore: false,
    })
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Use at least 12 characters with uppercase, lowercase, number, and symbol.",
    });
  }

  if (Buffer.byteLength(value, "utf8") > MAX_BCRYPT_BYTES) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password must be no more than 72 characters long.",
    });
  }
});

const passwordChecks = [
  {
    id: "length",
    label: "At least 12 characters",
    isValid: (value: string) => value.length >= 12,
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter",
    isValid: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "lowercase",
    label: "At least one lowercase letter",
    isValid: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "At least one number",
    isValid: (value: string) => /[0-9]/.test(value),
  },
  {
    id: "symbol",
    label: "At least one symbol",
    isValid: (value: string) => /[^a-zA-Z0-9]/.test(value),
  },
  {
    id: "trimmed",
    label: "No leading or trailing whitespace",
    isValid: (value: string) => value === value.trim(),
  },
  {
    id: "bcrypt-bytes",
    label: "No more than 72 characters",
    isValid: (value: string) =>
      Buffer.byteLength(value, "utf8") <= MAX_BCRYPT_BYTES,
  },
] as const;

export function getPasswordChecks(value: string) {
  return passwordChecks.map((check) => ({
    ...check,
    passed: check.isValid(value),
  }));
}

const registerFieldsSchema = z.object({
  firstName: personalNameSchema,
  lastName: personalNameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
});

export const profileFormSchema = z
  .object({
    firstName: personalNameSchema,
    lastName: personalNameSchema,
    email: emailSchema,
  })
  .superRefine((value, context) => {
    if (`${value.firstName} ${value.lastName}`.length > 80) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastName"],
        message: "Full name must be 80 characters or fewer.",
      });
    }
  });

export const registerFormSchema = registerFieldsSchema.superRefine(
  (value, context) => {
    if (value.confirmPassword.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Confirm your password.",
      });
    }

    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  },
);

export const registerRequestSchema = registerFieldsSchema.omit({
  confirmPassword: true,
});

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type RegisterRequestValues = z.infer<typeof registerRequestSchema>;
export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

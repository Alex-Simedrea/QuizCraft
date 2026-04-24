"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { PasswordField } from "@/components/auth/password-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { registerAction } from "@/lib/auth/actions";
import type { AuthApiResponse, AuthFieldErrors } from "@/lib/auth/contracts";
import {
  registerFormSchema,
  type RegisterFormValues,
} from "@/lib/validation/auth";

function applyFieldErrors(
  setError: ReturnType<typeof useForm<RegisterFormValues>>["setError"],
  fieldErrors?: AuthFieldErrors,
) {
  if (!fieldErrors) {
    return;
  }

  for (const [fieldName, errors] of Object.entries(fieldErrors)) {
    if (!errors?.length) {
      continue;
    }

    if (
      fieldName !== "firstName" &&
      fieldName !== "lastName" &&
      fieldName !== "email" &&
      fieldName !== "password" &&
      fieldName !== "confirmPassword"
    ) {
      continue;
    }

    setError(fieldName, {
      type: "server",
      message: errors[0],
    });
  }
}

export function RegisterForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setSubmitError(null);
    form.clearErrors();
    const payload = (await registerAction({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
    })) as AuthApiResponse;

    if (!payload.success) {
      applyFieldErrors(form.setError, payload.fieldErrors);
      setSubmitError(payload.fieldErrors ? null : payload.message);
      return;
    }

    router.replace(payload.redirectTo);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Enter your details to create your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {submitError ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Account creation failed</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <Controller
              control={form.control}
              name="firstName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="register-first-name">
                    First name
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <UserRound />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="register-first-name"
                      aria-invalid={fieldState.invalid}
                      autoComplete="given-name"
                      placeholder="Alex"
                    />
                  </InputGroup>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="lastName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="register-last-name">
                    Last name
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <UserRound />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="register-last-name"
                      aria-invalid={fieldState.invalid}
                      autoComplete="family-name"
                      placeholder="Johnson"
                    />
                  </InputGroup>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="register-email">Email</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Mail />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="register-email"
                      aria-invalid={fieldState.invalid}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      inputMode="email"
                      placeholder="you@example.com"
                      type="email"
                    />
                  </InputGroup>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <PasswordField
                  autoComplete="new-password"
                  error={fieldState.error}
                  field={field}
                  label="Password"
                  placeholder="Create a password"
                  showRequirements
                />
              )}
            />
            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <PasswordField
                  autoComplete="new-password"
                  error={fieldState.error}
                  field={field}
                  label="Confirm password"
                  placeholder="Repeat your password"
                />
              )}
            />
          </FieldGroup>
          <Button disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? (
              <Spinner data-icon="inline-start" />
            ) : null}
            Create account
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4">
        <Separator />
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            className="font-medium text-foreground underline underline-offset-4"
            href="/login"
          >
            Sign in
          </Link>
          .
        </p>
      </CardFooter>
    </Card>
  );
}

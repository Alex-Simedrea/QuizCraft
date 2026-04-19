"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";

import { loginAction } from "@/lib/auth/actions";
import type { AuthApiResponse, AuthFieldErrors } from "@/lib/auth/contracts";
import { loginFormSchema, type LoginFormValues } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { PasswordField } from "@/components/auth/password-field";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

type LoginFormProps = {
  nextPath?: string;
};

function applyFieldErrors(
  setError: ReturnType<typeof useForm<LoginFormValues>>["setError"],
  fieldErrors?: AuthFieldErrors,
) {
  if (!fieldErrors) {
    return;
  }

  for (const [fieldName, errors] of Object.entries(fieldErrors)) {
    if (!errors?.length) {
      continue;
    }

    if (fieldName !== "email" && fieldName !== "password") {
      continue;
    }

    setError(fieldName, {
      type: "server",
      message: errors[0],
    });
  }
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    form.clearErrors();
    const payload = (await loginAction({
      ...values,
      next: nextPath,
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
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your email and password to continue.</CardDescription>
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
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-email">Email</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Mail />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="login-email"
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
                  autoComplete="current-password"
                  error={fieldState.error}
                  field={field}
                  label="Password"
                  placeholder="Enter your password"
                />
              )}
            />
          </FieldGroup>
          <Button disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            Sign in
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4">
        <Separator />
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link className="font-medium text-foreground underline underline-offset-4" href="/register">
            Create an account
          </Link>
          .
        </p>
      </CardFooter>
    </Card>
  );
}

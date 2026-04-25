"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Spinner } from "@/components/ui/spinner";
import { updateProfileAction } from "@/lib/auth/actions";
import type { AuthApiResponse, AuthFieldErrors } from "@/lib/auth/contracts";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/lib/validation/auth";

type ProfileFormProps = {
  user: ProfileFormValues;
};

function applyFieldErrors(
  setError: ReturnType<typeof useForm<ProfileFormValues>>["setError"],
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
      fieldName !== "email"
    ) {
      continue;
    }

    setError(fieldName, {
      type: "server",
      message: errors[0],
    });
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: user,
  });

  async function onSubmit(values: ProfileFormValues) {
    setSubmitError(null);
    setSubmitSuccess(null);
    form.clearErrors();

    const payload = (await updateProfileAction(values)) as AuthApiResponse;

    if (!payload.success) {
      applyFieldErrors(form.setError, payload.fieldErrors);
      setSubmitError(payload.fieldErrors ? null : payload.message);
      return;
    }

    form.reset(values);
    setSubmitSuccess("Your profile has been updated.");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Update the account details shown across your dashboard.
        </CardDescription>
      </CardHeader>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <div className="flex flex-col gap-6">
            {submitError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Profile update failed</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
            <FieldGroup className="gap-4">
              <Controller
                control={form.control}
                name="firstName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="profile-first-name">
                      First name
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <UserRound />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="profile-first-name"
                        aria-invalid={fieldState.invalid}
                        autoComplete="given-name"
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
                    <FieldLabel htmlFor="profile-last-name">
                      Last name
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <UserRound />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="profile-last-name"
                        aria-invalid={fieldState.invalid}
                        autoComplete="family-name"
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
                    <FieldLabel htmlFor="profile-email">Email</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Mail />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="profile-email"
                        aria-invalid={fieldState.invalid}
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        inputMode="email"
                        type="email"
                      />
                    </InputGroup>
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />
            </FieldGroup>
            <Button
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
              type="submit"
              className="w-full"
            >
              {form.formState.isSubmitting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Check data-icon="inline-start" />
              )}
              Save changes
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

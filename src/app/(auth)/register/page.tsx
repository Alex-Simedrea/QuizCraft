import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a secure QuizCraft account.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}

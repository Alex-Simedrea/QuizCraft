import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Sign In",
  description: "Access your QuizCraft workspace securely.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return <LoginForm nextPath={next} />;
}

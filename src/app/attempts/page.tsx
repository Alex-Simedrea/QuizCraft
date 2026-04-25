import { AttemptsDashboard } from "@/components/quiz/attempts/attempts-dashboard";
import { MyAttemptsHeader } from "@/components/quiz/attempts/my-attempts-header";
import { getQuizAttemptDashboardAction } from "@/lib/quiz/attempts/actions";

export default async function MyAttemptsPage() {
  const attempts = await getQuizAttemptDashboardAction();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6 pt-20 md:p-8 md:pt-20 lg:p-10 lg:pt-20">
      <MyAttemptsHeader />
      <AttemptsDashboard attempts={attempts} />
    </div>
  );
}

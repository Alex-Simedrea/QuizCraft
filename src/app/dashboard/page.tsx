import { PromptBuilder } from "@/components/dashboard/prompt-builder";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 justify-center p-6 md:p-8 lg:p-10">
      <PromptBuilder />
    </div>
  );
}

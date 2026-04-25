import { type ReactNode } from "react";

type QuizWorkspaceShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  title: string;
  titlePrefix?: ReactNode;
};

export function QuizWorkspaceShell({
  actions,
  children,
  title,
  titlePrefix,
}: QuizWorkspaceShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6 md:p-8 lg:p-10 lg:pt-20">
      <header className="flex flex-row justify-between gap-3 py-4 sm:items-center">
        <div className="flex items-center gap-2">
          {titlePrefix}
          <h1 className="text-3xl font-semibold max-sm:text-lg">{title}</h1>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {children}
    </div>
  );
}

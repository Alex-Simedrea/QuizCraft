import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QuizNotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl items-center justify-center p-6 md:p-8 lg:p-10">
      <Card className="w-full max-w-xl shadow-none ring-0">
        <CardHeader>
          <CardTitle className="text-2xl">Quiz not found</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            This quiz does not exist, you do not have access to it, or it may
            have been removed.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

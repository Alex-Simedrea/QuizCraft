import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6 md:p-8 lg:p-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            This page is stubbed so the footer dropdown has a real destination. We can add quiz,
            account, and app-level preferences here later.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Settings placeholder.
        </CardContent>
      </Card>
    </div>
  );
}

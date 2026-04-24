import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6 md:p-8 lg:p-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            This page is stubbed so the dashboard footer menu is fully wired. We
            can add editable account details in a later slice.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Profile settings placeholder.
        </CardContent>
      </Card>
    </div>
  );
}

import { ProfileForm } from "@/components/dashboard/profile-form";
import { requireCurrentSession } from "@/lib/auth/session";

export default async function ProfilePage() {
  const session = await requireCurrentSession();

  return (
    <div className="flex flex-1 items-center justify-center p-6 md:p-8 lg:p-10">
      <ProfileForm
        user={{
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          email: session.user.email,
        }}
      />
    </div>
  );
}

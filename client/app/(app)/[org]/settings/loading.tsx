import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-6 w-full">
        {/* Account Settings Card */}
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="font-header text-xl">
              <Skeleton className="h-7 w-40" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-56" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>

            {/* Full Name field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Phone field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </CardContent>

          {/* Password Section */}
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="font-header text-xl">
                <Skeleton className="h-7 w-28" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-52" />
              </CardDescription>
            </div>

            {/* New Password field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Confirm Password field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Change Password button */}
            <div className="flex justify-end pt-2">
              <Skeleton className="h-10 w-40 rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Support, Organizations, Notifications */}
        <div className="flex flex-col gap-6">
          {/* Support Card */}
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="font-header text-xl">
                <Skeleton className="h-7 w-24" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-36" />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-[120px] w-full" />
              <div className="flex justify-end">
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            </CardContent>
          </Card>

          {/* Organizations Card */}
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-9 w-20 rounded-full" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-72" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Organization items */}
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Settings/Notifications Card */}
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="font-header text-xl">
                <Skeleton className="h-7 w-24" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-44" />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dark Mode toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-5 w-24 mb-1" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>

              {/* Email Notifications toggle */}
              <div className="flex items-center justify-between pt-4">
                <div>
                  <Skeleton className="h-5 w-40 mb-1" />
                  <Skeleton className="h-4 w-44" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

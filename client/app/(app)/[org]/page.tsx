import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, MapPin } from "lucide-react";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface OrgHomePageProps {
  params: Promise<{ org: string }>;
}

export default async function OrgHomePage({ params }: OrgHomePageProps) {
  const { org: orgSlug } = await params;

  const supabase = await getSupabaseServer();
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (error || !org) {
    notFound();
  }

  // Get upcoming shows
  const { data: upcomingShows } = await supabase
    .from("shows")
    .select("id, title, date, set_time, venues(name, city)")
    .eq("org_id", org.id)
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true })
    .limit(5);

  const today = new Date().toISOString().split("T")[0];
  const todaysShows =
    upcomingShows?.filter((show) => show.date === today) || [];
  const nextWeekShows =
    upcomingShows?.filter((show) => show.date !== today) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            {org.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/${orgSlug}/shows`}>
            <Button size="lg" className="text-base">
              <Calendar className="w-5 h-5" />
              View All Shows
            </Button>
          </Link>
        </div>
      </div>

      {/* TODAY'S SHOWS - Most Important */}
      {todaysShows.length > 0 && (
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              Today&apos;s Shows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysShows.map((show) => (
              <Link key={show.id} href={`/${orgSlug}/shows/${show.id}`}>
                <div className="p-4 bg-background rounded-lg hover:shadow-md transition-all border border-border hover:border-primary">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{show.title}</h3>
                      <p className="text-muted-foreground">
                        {show.venues?.name} • {show.venues?.city}
                      </p>
                    </div>
                    <Badge className="text-base px-3 py-1">
                      {show.set_time || "TBD"}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* UPCOMING THIS WEEK */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Upcoming Shows</h2>
          <Link href={`/${orgSlug}/shows`}>
            <Button variant="outline">View All</Button>
          </Link>
        </div>

        {nextWeekShows.length === 0 && todaysShows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Upcoming Shows</h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first show
              </p>
              <Link href={`/${orgSlug}/shows`}>
                <Button size="lg">
                  <Calendar className="w-5 h-5" />
                  Create Show
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {nextWeekShows.map((show) => (
              <Link key={show.id} href={`/${orgSlug}/shows/${show.id}`}>
                <Card className="hover:shadow-md transition-all hover:border-primary/50">
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <div className="text-2xl font-bold">
                            {new Date(show.date).getDate()}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {new Date(show.date).toLocaleDateString("en-US", {
                              month: "short",
                            })}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {show.title}
                          </h3>
                          <p className="text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {show.venues?.name} • {show.venues?.city}
                          </p>
                        </div>
                      </div>
                      {show.set_time && (
                        <Badge
                          variant="outline"
                          className="text-base px-3 py-1"
                        >
                          {show.set_time}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* QUICK ACTIONS - BIG BUTTONS */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href={`/${orgSlug}/people`}>
            <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer h-full bg-gradient-to-br from-blue-500/10 to-transparent border-2 hover:border-blue-500/50">
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-3 text-blue-500" />
                <h3 className="font-bold text-xl mb-1">People</h3>
                <p className="text-sm text-muted-foreground">
                  Manage team & contacts
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/${orgSlug}/venues`}>
            <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer h-full bg-gradient-to-br from-green-500/10 to-transparent border-2 hover:border-green-500/50">
              <CardContent className="py-8 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <h3 className="font-bold text-xl mb-1">Venues</h3>
                <p className="text-sm text-muted-foreground">
                  Find & manage venues
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/${orgSlug}/profile`}>
            <Card className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer h-full bg-gradient-to-br from-purple-500/10 to-transparent border-2 hover:border-purple-500/50">
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-3 text-purple-500" />
                <h3 className="font-bold text-xl mb-1">Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Organization settings
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addToWaitlist } from "@/lib/actions/waitlist";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function WaitlistPage() {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "artist" as
      | "artist"
      | "manager"
      | "agent"
      | "venue"
      | "promoter"
      | "other",
    company: "",
    phone: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await addToWaitlist(formData);

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Join the Oncore Waitlist
          </h1>
          <p className="text-xl text-muted-foreground">
            Be among the first to experience the future of touring management
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Get Early Access</CardTitle>
            <CardDescription>
              Launch date: October 31st, 2025. Sign up now to secure your spot
              and get notified when we go live.
            </CardDescription>
          </CardHeader>

          {submitted ? (
            <CardContent className="text-center py-12 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-2xl font-bold">You are on the list!</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Thanks for joining,{" "}
                <strong>{formData.name || formData.email}</strong>. We will be
                in touch soon with exclusive updates and early access details.
              </p>
              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      email: "",
                      name: "",
                      role: "artist",
                      company: "",
                      phone: "",
                      notes: "",
                    });
                  }}
                >
                  Add Another Person
                </Button>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">I am a... *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleChange("role", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="artist">Artist / Performer</SelectItem>
                      <SelectItem value="manager">Tour Manager</SelectItem>
                      <SelectItem value="agent">Booking Agent</SelectItem>
                      <SelectItem value="venue">
                        Venue Representative
                      </SelectItem>
                      <SelectItem value="promoter">Promoter</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company / Band Name</Label>
                    <Input
                      id="company"
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleChange("company", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Tell us about your needs</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="What features are you most excited about? Any specific challenges you're facing?"
                    rows={3}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                    {error}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Waitlist"
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  By joining, you will receive updates about Oncore&#39;s launch
                  and exclusive early access opportunities.
                </p>
              </CardFooter>
            </form>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <div className="text-3xl font-bold">📧</div>
            <div className="text-sm font-medium mt-2">Email Parsing</div>
            <div className="text-xs text-muted-foreground">
              Auto-extract show details
            </div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold">📄</div>
            <div className="text-sm font-medium mt-2">Contract AI</div>
            <div className="text-xs text-muted-foreground">
              Parse contracts instantly
            </div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold">📅</div>
            <div className="text-sm font-medium mt-2">Calendar Sync</div>
            <div className="text-xs text-muted-foreground">
              Keep everything in sync
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

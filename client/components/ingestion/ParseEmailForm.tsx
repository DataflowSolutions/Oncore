"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { parseEmail } from "@/lib/actions/email";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ParseEmailFormProps {
  orgId: string;
}

export function ParseEmailForm({ orgId }: ParseEmailFormProps) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!body.trim()) {
      toast.error("Please paste the email body");
      return;
    }

    startTransition(async () => {
      const result = await parseEmail({
        orgId,
        subject: subject.trim() || "(No subject)",
        body,
        from: from.trim() || undefined,
      });

      if (result.success) {
        toast.success("Email parsed successfully");
        setSubject("");
        setFrom("");
        setBody("");
        router.refresh();
      } else {
        toast.error("Failed to parse email", {
          description: result.error,
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parse forwarded offer email</CardTitle>
        <CardDescription>
          Paste the raw email content and we&apos;ll extract show, venue, and contact
          details for review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="parse-email-subject"
                className="text-sm font-medium"
              >
                Subject
              </label>
              <Input
                id="parse-email-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Offer for July 18 - Summer Festival"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="parse-email-from"
                className="text-sm font-medium"
              >
                From (optional)
              </label>
              <Input
                id="parse-email-from"
                type="email"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                placeholder="promoter@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="parse-email-body" className="text-sm font-medium">
              Email body
            </label>
            <Textarea
              id="parse-email-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Paste the full email body including offer details, fees, schedule, etc."
              rows={12}
              required
            />
          </div>

          <div className="flex items-center justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Parsing…" : "Parse email"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

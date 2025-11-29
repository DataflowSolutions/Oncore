"use client";

import { useState } from "react";
import { assignPlanDebug } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Replace the custom Select with a native <select> for simpler behavior

interface BillingDebugFormProps {
  orgId: string;
  plans: Array<{
    id: string;
    name: string;
    description: string | null;
    price_cents: number;
    max_artists: number | null;
    max_members: number | null;
    max_collaborators: number | null;
  }>;
}

export function BillingDebugForm({ orgId, plans }: BillingDebugFormProps) {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setIsLoading(true);
    setMessage("");

    try {
      await assignPlanDebug(orgId, selectedPlan);
      setMessage(
        "Plan assigned successfully! Refresh the page to see changes."
      );
    } catch (error) {
      setMessage(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Select Plan
          </label>
          <div>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              required
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9"
            >
              <option value="" disabled className="bg-card">
                Choose a plan...
              </option>
              {plans.map((plan) => (
                <option
                  key={plan.id}
                  value={plan.id}
                  className="text-foreground bg-card"
                >
                  {plan.name} - ${plan.price_cents / 100}/month
                  {plan.max_artists ? ` (${plan.max_artists} artists)` : ""}
                  {plan.max_members ? ` (${plan.max_members} members)` : ""}
                  {plan.max_collaborators
                    ? ` (${plan.max_collaborators} collaborators)`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>



        <Button
          type="submit"
          disabled={isLoading || !selectedPlan}
          variant="default"
        >
          {isLoading ? "Assigning..." : "Assign Plan"}
        </Button>
      </form>

      {message && (
        <Card
          className={`mt-4 ${
            message.startsWith("Error")
              ? "border-red-500 bg-red-900/20"
              : "border-green-500 bg-green-900/20"
          }`}
        >
          <CardContent>
            <p
              className={
                message.startsWith("Error") ? "text-red-400" : "text-green-400"
              }
            >
              {message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plan Details */}
      {selectedPlan && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Plan Details</CardTitle>
          </CardHeader>
          <CardContent>
            {plans.find((p) => p.id === selectedPlan) && (
              <div className="text-sm text-foreground/80 space-y-1">
                <p>
                  <strong>Name:</strong>{" "}
                  {plans.find((p) => p.id === selectedPlan)?.name}
                </p>
                <p>
                  <strong>Description:</strong>{" "}
                  {plans.find((p) => p.id === selectedPlan)?.description ||
                    "N/A"}
                </p>
                <p>
                  <strong>Price:</strong> $
                  {(plans.find((p) => p.id === selectedPlan)?.price_cents ||
                    0) / 100}
                  /month
                </p>
                <p>
                  <strong>Limits:</strong>
                  {plans.find((p) => p.id === selectedPlan)?.max_artists ||
                    "Unlimited"}{" "}
                  artists,{" "}
                  {plans.find((p) => p.id === selectedPlan)?.max_members ||
                    "Unlimited"}{" "}
                  members,{" "}
                  {plans.find((p) => p.id === selectedPlan)
                    ?.max_collaborators || "Unlimited"}{" "}
                  collaborators
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { BillingStatus } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, AlertTriangle } from "lucide-react";

interface BillingGateProps {
  billingStatus: BillingStatus;
  orgName: string;
}

export function BillingGate({ billingStatus, orgName }: BillingGateProps) {
  if (billingStatus.isActive) {
    return null; // No gate needed
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <CardTitle className="text-xl">Subscription Required</CardTitle>
          <CardDescription>
            {orgName} needs an active subscription to continue using Oncore.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingStatus.status === "past_due" && (
            <Card className="bg-yellow-50/10 border-yellow-200 mb-4">
              <CardContent className="pt-6">
                <p className="text-sm text-yellow-300">
                  <strong>Grace Period:</strong> {billingStatus.daysUntilExpiry}{" "}
                  days remaining
                  {billingStatus.gracePeriodEnds && (
                    <span className="block text-xs mt-1">
                      Expires:{" "}
                      {new Date(
                        billingStatus.gracePeriodEnds
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <Button className="w-full" variant="default">
              Update Billing
            </Button>
            <Button className="w-full" variant="outline">
              Contact Support
            </Button>
          </div>

          <p className="text-xs text-foreground/50 mt-4">
            Questions? Email us at billing@oncore.app
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface SubscriptionBannerProps {
  billingStatus: BillingStatus;
}

export function SubscriptionBanner({ billingStatus }: SubscriptionBannerProps) {
  if (billingStatus.isActive && billingStatus.status !== "trialing") {
    return null;
  }

  const getBannerStyle = () => {
    if (billingStatus.requiresImmediateAction) {
      return "bg-destructive/10 border-l-destructive text-destructive";
    }
    if (billingStatus.status === "past_due") {
      return "bg-yellow-500/10 border-l-yellow-500 text-yellow-600 dark:text-yellow-400";
    }
    return "bg-muted/50 border-l-muted-foreground/30 text-muted-foreground";
  };

  const getMessage = () => {
    if (billingStatus.status === "trialing") {
      return {
        text: "Trial expires in",
        days: billingStatus.daysUntilExpiry,
        iconType: "clock",
      };
    }
    if (billingStatus.status === "past_due") {
      return {
        text: "Payment overdue",
        days: billingStatus.daysUntilExpiry,
        iconType: "alert",
      };
    }
    return {
      text: "Subscription requires attention",
      days: null,
      iconType: "alert",
    };
  };

  const message = getMessage();

  const renderIcon = () => {
    if (message.iconType === "clock") {
      return <Clock className="w-4 h-4" />;
    }
    return <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div
      className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg border backdrop-blur-sm max-w-sm z-50 ${getBannerStyle()}`}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2 flex-1">
          {renderIcon()}
          <span className="text-sm">
            {message.text}
            {message.days && (
              <span className="ml-1 font-medium">{message.days} days</span>
            )}
          </span>
        </div>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs shrink-0 cursor-pointer"
        >
          Update Billing
        </Button>
      </div>
    </div>
  );
}

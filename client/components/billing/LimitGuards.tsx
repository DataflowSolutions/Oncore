import { logger } from '@/lib/logger'
"use client";

import { useState, useEffect } from "react";
import { LimitCheck } from "@/lib/billing";
import { checkOrgLimitsClient } from "@/lib/billing-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, UserCheck, Crown } from "lucide-react";

interface LimitGuardProps {
  orgId: string;
  checkType: "members" | "collaborators" | "artists";
  additionalCount?: number;
  children: (
    limitCheck: LimitCheck | null,
    isLoading: boolean
  ) => React.ReactNode;
}

export function LimitGuard({
  orgId,
  checkType,
  additionalCount = 1,
  children,
}: LimitGuardProps) {
  const [limitCheck, setLimitCheck] = useState<LimitCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLimits() {
      setIsLoading(true);
      try {
        const result = await checkOrgLimitsClient(
          orgId,
          checkType,
          additionalCount
        );
        setLimitCheck(result);
      } catch (error) {
        logger.error("`Failed to check limits", error);
        setLimitCheck(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLimits();
  }, [orgId, checkType, additionalCount]);

  return <>{children(limitCheck, isLoading)}</>;
}

interface UpgradePromptProps {
  actionName: string; // e.g., "invite collaborator", "add member"
  onUpgrade?: () => void;
}

export function UpgradePrompt({ actionName, onUpgrade }: UpgradePromptProps) {
  return (
    <div className="border-l-2 border-amber-500/50 bg-amber-500/5 p-3 rounded-r-md mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            Upgrade to {actionName}
          </span>
        </div>
        <Button
          onClick={onUpgrade}
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
        >
          Upgrade
        </Button>
      </div>
    </div>
  );
}

interface InviteCollaboratorButtonProps {
  orgId: string;
  showId?: string;
  onInvite?: () => void;
  disabled?: boolean;
}

export function InviteCollaboratorButton({
  orgId,
  onInvite,
  disabled,
}: InviteCollaboratorButtonProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <LimitGuard orgId={orgId} checkType="collaborators">
        {(limitCheck, isLoading) => {
          if (isLoading) {
            return (
              <Button
                disabled
                variant="outline"
                className="opacity-50 border-muted-foreground/20"
              >
                <UserCheck className="w-4 h-4 mr-2 animate-pulse" />
                Loading...
              </Button>
            );
          }

          if (!limitCheck?.allowed) {
            return (
              <div className="space-y-2">
                <Button
                  disabled
                  variant="outline"
                  className="opacity-50 border-muted-foreground/20"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Invite Collaborator
                </Button>
                {limitCheck && (
                  <UpgradePrompt
                    actionName="invite more collaborators"
                    onUpgrade={() => {
                      // In a real app, redirect to billing page or open upgrade modal
                      window.location.href = `/billing-debug`;
                    }}
                  />
                )}
              </div>
            );
          }

          return (
            <div className="space-y-1">
              <Button
                onClick={() => setShowForm(!showForm)}
                disabled={disabled}
                variant="outline"
                className="border-muted-foreground/30 hover:bg-muted/50 hover:border-muted-foreground/50"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Invite Collaborator
              </Button>

              {limitCheck && (
                <p className="text-xs text-muted-foreground">
                  {limitCheck.remaining} of {limitCheck.limit} collaborator
                  slots available
                </p>
              )}

              {showForm && (
                <Card className="mt-3 border-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Invite Collaborator
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Send an invitation to collaborate on this project.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setShowForm(false);
                          onInvite?.();
                        }}
                        size="sm"
                        variant="outline"
                        className="border-muted-foreground/30 hover:bg-muted/50 hover:border-muted-foreground/50"
                      >
                        Send Invite
                      </Button>
                      <Button
                        onClick={() => setShowForm(false)}
                        size="sm"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        }}
      </LimitGuard>
    </div>
  );
}

interface AddMemberButtonProps {
  orgId: string;
  onAdd?: () => void;
  disabled?: boolean;
}

export function AddMemberButton({
  orgId,
  onAdd,
  disabled,
}: AddMemberButtonProps) {
  return (
    <LimitGuard orgId={orgId} checkType="members">
      {(limitCheck, isLoading) => {
        if (isLoading) {
          return (
            <Button
              disabled
              variant="outline"
              className="opacity-50 border-muted-foreground/20"
            >
              <UserPlus className="w-4 h-4 mr-2 animate-pulse" />
              Loading...
            </Button>
          );
        }

        if (!limitCheck?.allowed) {
          return (
            <div className="space-y-2">
              <Button
                disabled
                variant="outline"
                className="opacity-50 border-muted-foreground/20"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
              {limitCheck && (
                <UpgradePrompt
                  actionName="add more team members"
                  onUpgrade={() => {
                    window.location.href = `/billing-debug`;
                  }}
                />
              )}
            </div>
          );
        }

        return (
          <div className="space-y-1">
            <Button
              onClick={onAdd}
              disabled={disabled}
              variant="outline"
              className="border-muted-foreground/30 hover:bg-muted/50 hover:border-muted-foreground/50"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
            {limitCheck && (
              <p className="text-xs text-muted-foreground">
                {limitCheck.remaining} of {limitCheck.limit} member slots
                available
              </p>
            )}
          </div>
        );
      }}
    </LimitGuard>
  );
}

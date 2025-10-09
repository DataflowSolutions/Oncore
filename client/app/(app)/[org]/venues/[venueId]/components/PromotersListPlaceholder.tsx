"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

const PromotersListPlaceholder = () => {
  return (
    <Card>
      <CardContent className="text-center py-16">
        <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Promoters</h3>
        <p className="text-muted-foreground mb-4">
          Manage promoters associated with this venue
        </p>
        <p className="text-sm text-muted-foreground">
          Promoter list functionality coming soon
        </p>
      </CardContent>
    </Card>
  );
};

export default PromotersListPlaceholder;

"use client";

import CardSwap, { Card } from "@/components/ui/card-swap";
import { DashboardPreview } from "@/components/dashboard-preview";
import { AlertsPreview } from "@/components/alerts-preview";
import { RunHistoryPreview } from "@/components/run-history-preview";

const CARD_W = 680;
const CARD_H = 460;

export function AppPreviewCarousel() {
  return (
    <CardSwap
      width={CARD_W}
      height={CARD_H}
      cardDistance={55}
      verticalDistance={70}
      delay={3000}
      skewAmount={5}
      easing="elastic"
    >
      <Card className="border border-border/50 shadow-2xl">
        <DashboardPreview />
      </Card>
      <Card className="border border-border/50 shadow-2xl">
        <AlertsPreview />
      </Card>
      <Card className="border border-border/50 shadow-2xl">
        <RunHistoryPreview />
      </Card>
    </CardSwap>
  );
}

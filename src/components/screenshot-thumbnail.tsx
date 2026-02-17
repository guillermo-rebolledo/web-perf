"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ZoomIn } from "lucide-react";
import { Button } from "./ui/button";

interface ScreenshotThumbnailProps {
  screenshotData: string;
  siteName: string;
  strategy: string;
  compact?: boolean;
}

export function ScreenshotThumbnail({
  screenshotData,
  siteName,
  strategy,
  compact = false,
}: ScreenshotThumbnailProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="group relative cursor-pointer overflow-hidden rounded-lg border">
          <img
            src={screenshotData}
            alt={`Screenshot of ${siteName} (${strategy})`}
            className={`w-full object-cover object-top transition-transform group-hover:scale-105 ${
              compact ? "h-20" : "h-48"
            }`}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
            <Button variant="secondary" size={compact ? "icon" : "sm"}>
              {compact ? (
                <ZoomIn className="h-4 w-4" />
              ) : (
                <>
                  <ZoomIn className="mr-2 h-4 w-4" />
                  View Full Size
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Page Screenshot</DialogTitle>
          <DialogDescription>
            {siteName} ({strategy} view)
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto">
          <img
            src={screenshotData}
            alt={`Full screenshot of ${siteName} (${strategy})`}
            className="w-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

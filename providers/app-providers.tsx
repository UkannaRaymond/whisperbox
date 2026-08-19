"use client";

import * as React from "react";

import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { MotionProvider } from "@/providers/motion-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <MotionProvider>
          <SocketProvider>
            <TooltipProvider>
              {children}
              <Toaster position="bottom-right" />
            </TooltipProvider>
          </SocketProvider>
        </MotionProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

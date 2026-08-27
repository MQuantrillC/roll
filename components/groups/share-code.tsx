"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareCode({ code, groupName }: { code: string; groupName: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — the code is visible on screen anyway
    }
  }

  async function share() {
    const text = `Join my group "${groupName}" on Roll with code ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Roll", text });
        return;
      } catch {
        // user cancelled — fall through to copy
      }
    }
    copy();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={copy}
        className="group flex items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/50 px-4 py-2 font-mono text-xl font-bold tracking-[0.3em] transition-colors hover:border-primary/60"
        title="Copy group code"
      >
        {code}
        {copied ? (
          <Check className="size-4 text-success" />
        ) : (
          <Copy className="size-4 text-muted-foreground group-hover:text-foreground" />
        )}
      </button>
      <Button variant="secondary" size="sm" onClick={share} aria-label="Share code">
        <Share2 className="size-4" />
      </Button>
    </div>
  );
}

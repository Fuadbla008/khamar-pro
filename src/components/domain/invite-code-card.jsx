"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeInviteAction } from "@/lib/members/actions";
import { ROLE_LABELS } from "@/lib/members/constants";
import { formatDate } from "@/lib/utils/format";

export function InviteCodeCard({ farmId, invite, joined, canRevoke }) {
  const [copied, setCopied] = useState(false);

  function shareOnWhatsApp() {
    const joinUrl = `${window.location.origin}/join/${invite.code}`;
    const message = `Khamar খামারে আমন্ত্রিত হয়েছেন। কোড: ${invite.code} | লিংক: ${joinUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className="space-y-3 rounded-card border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-base font-semibold tracking-wide">
            {invite.code}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ROLE_LABELS[invite.role] ?? invite.role} ·{" "}
            {formatDate(invite.created_at?.slice(0, 10))} তৈরি
          </p>
        </div>
        <Badge
          variant={invite.is_active ? "default" : "secondary"}
          className="shrink-0 rounded-pill"
        >
          {invite.is_active ? "চালু" : "বাতিল"}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>ব্যবহৃত {invite.used_count}/{invite.max_uses}</span>
        <span>মেয়াদ {formatDate(invite.expires_at?.slice(0, 10))}</span>
      </div>

      {joined?.length ? (
        <ul className="space-y-1 rounded-input bg-muted/60 p-3 text-xs">
          {joined.map((entry) => (
            <li key={entry.member_id} className="flex justify-between gap-2">
              <span className="truncate">{entry.full_name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatDate(entry.joined_at?.slice(0, 10))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">এখনো কেউ যোগ দেননি</p>
      )}

      {invite.is_active ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={shareOnWhatsApp}
            className="press min-h-11 rounded-input"
          >
            <MessageCircle className="size-4" />
            WhatsApp-এ পাঠাও
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={copyCode}
            className="press min-h-11 rounded-input"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? "কপি হয়েছে" : "কোড কপি"}
          </Button>
          {canRevoke ? (
            <form action={revokeInviteAction}>
              <input type="hidden" name="farmId" value={farmId} />
              <input type="hidden" name="inviteId" value={invite.id} />
              <Button
                type="submit"
                variant="ghost"
                className="press min-h-11 rounded-input text-destructive"
              >
                <Ban className="size-4" />
                বাতিল
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

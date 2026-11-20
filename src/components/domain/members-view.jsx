"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmSubmit } from "@/components/forms/confirm-submit";
import {
  createInviteAction,
  leaveFarmAction,
  removeMemberAction,
  updateMemberAction,
} from "@/lib/members/actions";
import {
  PERMISSIONS,
  ROLES,
  ROLE_LABELS,
} from "@/lib/members/constants";
import { formatDate } from "@/lib/utils/format";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { InviteCodeCard } from "./invite-code-card";
import { ResponsiveModal } from "./responsive-modal";

function PermissionChecks({ selected = {} }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">অনুমতি</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {PERMISSIONS.map((permission) => (
          <Label
            key={permission.key}
            htmlFor={`permission-${permission.key}`}
            className="flex min-h-11 items-center gap-2 font-normal"
          >
            <Checkbox
              id={`permission-${permission.key}`}
              name="permissions"
              value={permission.key}
              defaultChecked={Boolean(selected[permission.key])}
            />
            {permission.label}
          </Label>
        ))}
      </div>
    </fieldset>
  );
}

function RoleSelect({ name, defaultValue = "member", id }) {
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger id={id} className="h-11 rounded-input">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            {role.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function InviteForm({ farmId, setOpen, router }) {
  const [state, action, pending] = useActionState(createInviteAction, null);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, setOpen, router]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="farmId" value={farmId} />

      <div className="space-y-2">
        <Label htmlFor="invite-role">ভূমিকা</Label>
        <RoleSelect name="role" id="invite-role" defaultValue="member" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="maxUses">সর্বোচ্চ ব্যবহার</Label>
          <Input
            id="maxUses"
            name="maxUses"
            type="number"
            min="1"
            max="50"
            defaultValue="1"
            className="h-11 rounded-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresInDays">মেয়াদ (দিন)</Label>
          <Input
            id="expiresInDays"
            name="expiresInDays"
            type="number"
            min="1"
            max="30"
            defaultValue="7"
            className="h-11 rounded-input"
          />
        </div>
      </div>

      <PermissionChecks />

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="press h-11 w-full rounded-input"
      >
        {pending ? "তৈরি করা হচ্ছে..." : "কোড তৈরি করুন"}
      </Button>
    </form>
  );
}

function MemberEditForm({ farmId, member, setEditing, router }) {
  const [state, action, pending] = useActionState(updateMemberAction, null);

  useEffect(() => {
    if (state?.ok) {
      setEditing(null);
      router.refresh();
    }
  }, [state, setEditing, router]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="farmId" value={farmId} />
      <input type="hidden" name="memberId" value={member.id} />

      <div className="space-y-2">
        <Label htmlFor="member-role">ভূমিকা</Label>
        <RoleSelect
          name="role"
          id="member-role"
          defaultValue={member.role}
        />
      </div>

      <PermissionChecks selected={member.permissions} />

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="press h-11 w-full rounded-input"
      >
        {pending ? "হালনাগাদ হচ্ছে..." : "হালনাগাদ করুন"}
      </Button>
    </form>
  );
}

export function MembersView({
  farmId,
  members,
  invites,
  joinLog,
  currentUserId,
  isOwner,
  canManageMembers,
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const joinedByInvite = (inviteId) =>
    joinLog.filter((entry) => entry.invite_id === inviteId);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">সদস্য</h1>
          <p className="text-sm text-muted-foreground">
            খামারে কে কে কাজ করছেন এবং কীভাবে যোগ দিয়েছেন
          </p>
        </div>
        {isOwner || canManageMembers ? (
          <Button
            onClick={() => setInviteOpen(true)}
            className="press h-11 rounded-input"
          >
            + সদস্য যোগ করুন
          </Button>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">সদস্যবৃন্দ ({members.length})</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const isSelf = member.user_id === currentUserId;
            const canEdit = isOwner && member.role !== "owner";

            return (
              <li
                key={member.id}
                className="space-y-3 rounded-card border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {member.full_name || "সদস্য"}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (আপনি)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.phone || "ফোন নেই"}
                    </p>
                  </div>
                  <Badge
                    variant={member.role === "owner" ? "default" : "secondary"}
                    className="shrink-0 rounded-pill"
                  >
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">যোগ দিয়েছে</dt>
                    <dd className="tabular-nums">
                      {formatDate(member.joined_at?.slice(0, 10))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">শেষ প্রবেশ</dt>
                    <dd className="tabular-nums">
                      {member.last_sign_in_at
                        ? formatDate(member.last_sign_in_at.slice(0, 10))
                        : "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">মোট খরচ এন্ট্রি</dt>
                    <dd className="tabular-nums">{member.expense_count} টি</dd>
                  </div>
                </dl>

                {canEdit ? (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditing(member)}
                      className="press min-h-11 rounded-input"
                    >
                      অনুমতি বদলান
                    </Button>
                    <form action={removeMemberAction}>
                      <input type="hidden" name="farmId" value={farmId} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <ConfirmSubmit
                        label="সরান"
                        confirmText={`${member.full_name || "এই সদস্য"} কে খামার থেকে সরাতে চান?`}
                        className="press min-h-11 rounded-input"
                      />
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">ইনভাইট কোড</h2>
          <p className="text-sm text-muted-foreground">
            কোড বা লিংক শেয়ার করে নতুন সদস্য যোগ করুন
          </p>
        </div>
        {invites.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {invites.map((invite) => (
              <InviteCodeCard
                key={invite.id}
                farmId={farmId}
                invite={invite}
                joined={joinedByInvite(invite.id)}
                canRevoke={isOwner}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            এখনো কোনো ইনভাইট কোড তৈরি করা হয়নি।
          </p>
        )}
      </section>

      {joinLog.length ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">যোগদানের ইতিহাস</h2>
          <ul className="divide-y divide-border rounded-card border border-border bg-card px-4 shadow-soft">
            {joinLog.map((entry) => (
              <li
                key={entry.member_id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span className="truncate">{entry.full_name}</span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{entry.invite_code}</span>
                  <span className="tabular-nums">
                    {formatDate(entry.joined_at?.slice(0, 10))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3 rounded-card border border-destructive/30 bg-card p-4">
        <div>
          <h2 className="text-base font-semibold text-destructive">ঝুঁকিপূর্ণ কাজ</h2>
          <p className="text-sm text-muted-foreground">
            খামার ত্যাগ করলে আপনি আর এই খামারের তথ্য দেখতে পাবেন না। শেষ মালিক
            খামার ত্যাগ করতে পারবেন না।
          </p>
        </div>
        <form action={leaveFarmAction}>
          <input type="hidden" name="farmId" value={farmId} />
          <ConfirmSubmit
            label="খামার ত্যাগ করুন"
            confirmText="আপনি কি নিশ্চিত যে খামার ত্যাগ করবেন?"
            className="press min-h-11 rounded-input"
          />
        </form>
      </section>

      <ResponsiveModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        isDesktop={isDesktop}
        title="নতুন ইনভাইট কোড"
        description="নতুন সদস্যের জন্য কোড তৈরি করুন"
      >
        <InviteForm farmId={farmId} setOpen={setInviteOpen} router={router} />
      </ResponsiveModal>

      {editing ? (
        <ResponsiveModal
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          isDesktop={isDesktop}
          title="সদস্যের অনুমতি"
          description={`${editing.full_name || "সদস্য"} এর ভূমিকা ও অনুমতি বদলান`}
        >
          <MemberEditForm
            key={editing.id}
            farmId={farmId}
            member={editing}
            setEditing={setEditing}
            router={router}
          />
        </ResponsiveModal>
      ) : null}
    </main>
  );
}

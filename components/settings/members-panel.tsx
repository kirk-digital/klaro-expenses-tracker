"use client";

import { useMemo, useState, useTransition } from "react";
import type { MemberRole, User } from "@prisma/client";
import { toast } from "sonner";
import { ORG_SLUG_HEADER } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type MemberRow = {
  id: string;
  role: MemberRole;
  user: Pick<User, "id" | "name" | "email">;
};

type InvitationRow = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: Date;
};

const roles: MemberRole[] = ["owner", "admin", "approver", "member"];

function formatExpiry(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function MembersPanel({
  slug,
  currentUserId,
  initialMembers,
  initialInvitations = [],
}: {
  slug: string;
  currentUserId: string;
  initialMembers: MemberRow[];
  initialInvitations?: InvitationRow[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [pending, startTransition] = useTransition();

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      [ORG_SLUG_HEADER]: slug,
    }),
    [slug]
  );

  function refreshMembers() {
    startTransition(async () => {
      const res = await fetch("/api/members", { headers });
      if (res.ok) {
        const data = (await res.json()) as MemberRow[];
        setMembers(data);
      }
    });
  }

  function refreshInvitations() {
    startTransition(async () => {
      const res = await fetch("/api/invitations", { headers });
      if (res.ok) {
        const data = (await res.json()) as InvitationRow[];
        setInvitations(data);
      }
    });
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers,
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not create invitation");
      return;
    }
    toast.success("Invitation sent", {
      description: `An invite email has been sent to ${inviteEmail}.`,
    });
    setInviteEmail("");
    setInviteOpen(false);
    refreshInvitations();
  }

  async function revokeInvitation(id: string, email: string) {
    if (!confirm(`Revoke the invitation for ${email}?`)) return;
    const res = await fetch(`/api/invitations?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not revoke invitation");
      return;
    }
    toast.success("Invitation revoked");
    setInvitations((prev) => prev.filter((inv) => inv.id !== id));
  }

  async function updateRole(userId: string, role: MemberRole) {
    const res = await fetch("/api/members", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ userId, role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not update role");
      return;
    }
    toast.success("Role updated");
    refreshMembers();
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the organisation?")) return;
    const res = await fetch(`/api/members?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not remove member");
      return;
    }
    toast.success("Member removed");
    refreshMembers();
  }

  return (
    <div className="space-y-8">
      {/* Header + Invite button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Manage who has access to this organisation.
        </p>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger className={buttonVariants()}>
            Invite member
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite by email</DialogTitle>
              <DialogDescription>
                They will receive an email with a sign-up link tied to their role.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={invite}>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => v && setInviteRole(v as MemberRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={pending}>
                Send invitation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active members table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isSelf = m.user.id === currentUserId;
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.user.name}</TableCell>
                  <TableCell>{m.user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={m.role}
                      disabled={isSelf}
                      onValueChange={(v) => v && updateRole(m.user.id, v as MemberRole)}
                    >
                      <SelectTrigger
                        className="w-36"
                        title={isSelf ? "You cannot change your own role" : undefined}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSelf}
                      onClick={() => removeMember(m.user.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Pending invitations</h3>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize">
                        {inv.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatExpiry(inv.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => revokeInvitation(inv.id, inv.email)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

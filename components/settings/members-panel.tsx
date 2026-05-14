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

const roles: MemberRole[] = ["owner", "admin", "approver", "member"];

export function MembersPanel({ slug, initialMembers }: { slug: string; initialMembers: MemberRow[] }) {
  const [members, setMembers] = useState(initialMembers);
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

  function refresh() {
    startTransition(async () => {
      const res = await fetch("/api/members", { headers });
      if (res.ok) {
        const data = (await res.json()) as MemberRow[];
        setMembers(data);
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
    toast.success("Invitation created", {
      description: data.inviteUrl,
      duration: 12000,
    });
    setInviteEmail("");
    setInviteOpen(false);
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
    refresh();
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
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Invite teammates with a link. Email delivery is not configured in V1.
        </p>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger className={buttonVariants()}>
            Invite member
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite by email</DialogTitle>
              <DialogDescription>They must sign up or sign in with this email to accept.</DialogDescription>
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
                Create invitation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.user.name}</TableCell>
                <TableCell>{m.user.email}</TableCell>
                <TableCell>
                  <Select
                    value={m.role}
                    onValueChange={(v) => v && updateRole(m.user.id, v as MemberRole)}
                  >
                    <SelectTrigger className="w-36">
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
                  <Button type="button" variant="outline" size="sm" onClick={() => removeMember(m.user.id)}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    name: z.string().refine((s) => s.trim().length >= 2, {
      message: "Enter your name",
    }),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Form = z.infer<typeof schema>;

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token") ?? searchParams.get("invite");
  const [loading, setLoading] = useState(false);
  const [inviteEmailLocked, setInviteEmailLocked] = useState(false);
  // Keep the invite email in a ref so the submit handler always has the
  // authoritative value even if FormData can't read it (iOS readOnly quirk).
  const inviteEmailRef = useRef<string>("");

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { setValue } = form;

  useEffect(() => {
    if (!inviteToken) return;

    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/invitations?token=${encodeURIComponent(inviteToken)}`);
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Invalid invitation link");
        return;
      }
      if (typeof data.email === "string") {
        inviteEmailRef.current = data.email;
        setValue("email", data.email);
        setInviteEmailLocked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteToken, setValue]);

  async function onSubmit(values: Form) {
    setLoading(true);
    try {
      const reg = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
        }),
      });
      const data = await reg.json().catch(() => ({}));
      if (!reg.ok) {
        const field = data.field as keyof Form | undefined;
        const fieldKeys: (keyof Form)[] = ["name", "email", "password", "confirmPassword"];
        if (field && fieldKeys.includes(field) && typeof data.error === "string") {
          form.setError(field, { message: data.error });
        } else {
          toast.error(typeof data.error === "string" ? data.error : "Could not create account");
        }
        return;
      }

      if (!data.signedIn) {
        const sign = await signIn("credentials", {
          email: values.email.trim().toLowerCase(),
          password: values.password,
          redirect: false,
        });
        if (sign?.error) {
          toast.error("Account created but sign-in failed. Try signing in manually.");
          router.push("/sign-in");
          return;
        }
      }

      let nextPath = "/onboarding";

      if (inviteToken) {
        const accept = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inviteToken }),
        });
        if (!accept.ok) {
          const err = await accept.json().catch(() => ({}));
          toast.error(typeof err.error === "string" ? err.error : "Could not accept invitation");
        } else {
          const acceptData = await accept.json().catch(() => ({}));
          if (typeof acceptData.orgSlug === "string") {
            nextPath = `/org/${acceptData.orgSlug}/dashboard`;
          }
          toast.success("You have joined the organisation");
        }
      }

      router.push(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          {inviteToken
            ? "Finish registration to accept your invitation."
            : "Start tracking expenses for your team."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            // iOS Safari autofill bypasses React's synthetic events entirely.
            // Read real DOM values via FormData before RHF validation runs.
            const fd = new FormData(e.currentTarget);
            const fields = ["name", "email", "password", "confirmPassword"] as const;
            fields.forEach((key) => {
              // When the invite email is locked, skip the FormData read for email —
              // it may be empty on iOS if the field was programmatically set.
              // The authoritative value is already in inviteEmailRef and RHF state.
              if (key === "email" && inviteEmailLocked) {
                if (inviteEmailRef.current) {
                  form.setValue("email", inviteEmailRef.current, {
                    shouldValidate: false,
                    shouldDirty: true,
                  });
                }
                return;
              }
              const val = fd.get(key);
              if (typeof val === "string") {
                form.setValue(key, val, { shouldValidate: false, shouldDirty: true });
              }
            });
            form.handleSubmit(onSubmit)();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            {inviteEmailLocked ? (
              <>
                {/* Hidden input keeps the value in FormData and registers with RHF */}
                <input type="hidden" {...form.register("email")} value={inviteEmailRef.current} />
                {/* Display the email as a non-interactive styled element */}
                <div className="flex h-9 w-full items-center rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                  {inviteEmailRef.current}
                </div>
              </>
            ) : (
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...form.register("email")}
              />
            )}
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <SignUpForm />
    </Suspense>
  );
}

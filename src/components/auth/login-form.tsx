"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { safeNextPath } from "@/lib/safe-next-path";
import { authService } from "@/services/auth.service";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: () => {
      toast.success("เข้าสู่ระบบสำเร็จ");
      router.replace(nextPath);
      router.refresh();
    },
    onError: (err: Error) => {
      const message = err.message || "เข้าสู่ระบบไม่สำเร็จ";
      setError(message);
      toast.error("เข้าสู่ระบบไม่สำเร็จ", message);
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("กรอกอีเมลและรหัสผ่าน");
      return;
    }

    loginMutation.mutate({
      email: email.trim(),
      password,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">อีเมล</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full"
          required
        />
      </div>

      <div>
        <Label htmlFor="password">รหัสผ่าน</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full"
          required
        />
      </div>

      {error ? (
        <p
          className="rounded-xl border border-[var(--danger)]/30 bg-[color-mix(in_oklab,var(--danger)_14%,var(--surface))] px-3 py-2 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? (
          <>
            <Spinner />
            กำลังเข้าสู่ระบบ...
          </>
        ) : (
          "เข้าสู่ระบบ"
        )}
      </Button>
    </form>
  );
}

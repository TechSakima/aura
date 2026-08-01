"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Label,
  SegmentedControl,
} from "@/components/ui";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase/client";
import { mergeAdminNextWithLast } from "@/lib/admin-last-route";

type Mode = "signin" | "signup";

const LOGIN_MODES: { id: Mode; label: string }[] = [
  { id: "signin", label: "Sign in" },
  { id: "signup", label: "Create studio" },
];

async function exchangeIdToken(idToken: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return res;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [studioName, setStudioName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  // If Firebase Auth still has the user (common after PWA cookie loss), mint a fresh Aura cookie.
  useEffect(() => {
    if (!firebaseConfigured()) {
      setRestoring(false);
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setRestoring(false);
      return;
    }

    let cancelled = false;
    const failOpen = window.setTimeout(() => {
      if (!cancelled) setRestoring(false);
    }, 8000);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      if (!user) {
        window.clearTimeout(failOpen);
        setRestoring(false);
        return;
      }
      try {
        const idToken = await user.getIdToken();
        const res = await exchangeIdToken(idToken);
        if (cancelled) return;
        window.clearTimeout(failOpen);
        if (!res.ok) {
          setRestoring(false);
          return;
        }
        router.replace(mergeAdminNextWithLast(params.get("next") || "/admin"));
        router.refresh();
      } catch {
        window.clearTimeout(failOpen);
        if (!cancelled) setRestoring(false);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(failOpen);
      unsub();
    };
  }, [params, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!firebaseConfigured()) {
        setError("Sign-in is unavailable. Try again later.");
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Sign-in is unavailable. Try again later.");
        return;
      }

      if (mode === "signup") {
        if (studioName.trim().length < 2) {
          setError("Enter a studio name.");
          return;
        }
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const idToken = await cred.user.getIdToken();
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, studioName: studioName.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Could not create studio");
          return;
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await cred.user.getIdToken();
        const res = await exchangeIdToken(idToken);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Login failed");
          return;
        }
      }

      router.push(mergeAdminNextWithLast(params.get("next") || "/admin"));
      router.refresh();
    } catch {
      setError(
        mode === "signup"
          ? "Could not create account. Email may already be in use."
          : "Invalid email or password",
      );
    } finally {
      setLoading(false);
    }
  }

  if (restoring) {
    return (
      <div className="mx-auto w-full max-w-md space-y-3">
        <h1 className="font-display text-4xl text-ink">Aura</h1>
        <EmptyState variant="loading" title="Signing you in…" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5">
      <div>
        <h1 className="font-display text-4xl text-ink">Aura</h1>
        <p className="mt-2 text-muted">Studio workspace</p>
      </div>

      <SegmentedControl
        ariaLabel="Account"
        options={LOGIN_MODES}
        value={mode}
        onChange={(next) => {
          setMode(next);
          setError("");
        }}
      />

      {mode === "signup" ? (
        <Field>
          <Label htmlFor="studioName">Studio name</Label>
          <Input
            id="studioName"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            autoComplete="organization"
            required
          />
        </Field>
      ) : null}

      <Field error={error}>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </Field>
      <Field>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={
            mode === "signup" ? "new-password" : "current-password"
          }
          required
          minLength={6}
        />
      </Field>
      <Button
        type="submit"
        className="w-full min-h-11"
        pending={loading}
        pendingLabel={mode === "signup" ? "Creating…" : "Signing in…"}
      >
        {mode === "signup" ? "Create studio" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="shell-pad flex min-h-full flex-1 items-center justify-center pt-[max(4rem,env(safe-area-inset-top))] pb-[max(4rem,env(safe-area-inset-bottom))]">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

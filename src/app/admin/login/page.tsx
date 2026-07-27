"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Button, Field, Input, Label } from "@/components/ui";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase/client";

type Mode = "signin" | "signup";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [studioName, setStudioName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!firebaseConfigured()) {
        setError("Firebase is not configured.");
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Firebase Auth is unavailable.");
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
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Login failed");
          return;
        }
      }

      router.push(params.get("next") || "/admin");
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

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5">
      <div>
        <h1 className="font-display text-4xl text-ink">Aura</h1>
        <p className="mt-2 text-muted">
          {mode === "signup"
            ? "Create your studio workspace."
            : "Sign in to your studio workspace."}
        </p>
      </div>

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
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? mode === "signup"
            ? "Creating…"
            : "Signing in…"
          : mode === "signup"
            ? "Create studio"
            : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "signup" ? (
          <>
            Already have a studio?{" "}
            <button
              type="button"
              className="text-ink underline underline-offset-2"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button
              type="button"
              className="text-ink underline underline-offset-2"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create a studio
            </button>
          </>
        )}
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="shell-pad flex min-h-full flex-1 items-center justify-center py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

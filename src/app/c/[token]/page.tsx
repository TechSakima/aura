"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Field, Input, Label } from "@/components/ui";

export default function SignContractPage() {
  const params = useParams<{ token: string }>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/contracts/${params.token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setTitle(d.contract.title);
          setBody(d.contract.body);
          setStatus(d.contract.status);
          if (d.contract.signerName) setName(d.contract.signerName);
        }
      });
  }, [params.token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/public/contracts/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerName: name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not sign");
      return;
    }
    setStatus("completed");
  }

  if (error && !title) {
    return <p className="shell-pad py-16 text-center text-muted">{error}</p>;
  }

  return (
    <div className="shell-pad mx-auto max-w-2xl py-16">
      <h1 className="font-display text-4xl">{title || "Contract"}</h1>
      <div className="prose mt-8 whitespace-pre-wrap text-ink">{body}</div>
      {status === "completed" ? (
        <p className="mt-8 text-muted">Signed{name ? ` by ${name}` : ""}.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-10 space-y-4 border-t border-line pt-8">
          <Field>
            <Label htmlFor="name">Type your full name to sign</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit">Sign contract</Button>
        </form>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ContractPublicView } from "@/components/public/ContractPublicView";
import { InstallHintDock } from "@/components/pwa/InstallHintDock";
import { PublicShell } from "@/components/shells/PublicShell";
import { EmptyState } from "@/components/ui";
import { publicStudioShellProps } from "@/lib/public-studio-shell";
import type { StudioTheme } from "@/lib/types";

export default function SignContractPage() {
  const params = useParams<{ token: string }>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [studioName, setStudioName] = useState("");
  const [studioTheme, setStudioTheme] = useState<StudioTheme | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signedAt, setSignedAt] = useState<string | undefined>();
  const [signedDate, setSignedDate] = useState<string | undefined>();
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch(`/api/public/contracts/${params.token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setTitle(d.contract.title);
          setBody(d.contract.body);
          setStatus(d.contract.status);
          setStudioName(d.studio?.name || "");
          setStudioTheme(d.studio?.theme ?? null);
          if (d.contract.signerName) setSignerName(d.contract.signerName);
          if (d.contract.signedAt) setSignedAt(d.contract.signedAt);
          if (d.contract.signedDate) setSignedDate(d.contract.signedDate);
          setPreview(Boolean(d.preview));
        }
        setReady(true);
      })
      .catch(() => {
        setError("Could not load");
        setReady(true);
      });
  }, [params.token]);

  const shell = publicStudioShellProps(studioTheme);

  if (!ready) {
    return (
      <PublicShell {...shell}>
        <EmptyState
          variant="loading"
          title="Loading…"
          className="py-16 text-center"
        />
      </PublicShell>
    );
  }

  if (error && !title) {
    return (
      <PublicShell {...shell}>
        <EmptyState
          variant="error"
          title={error}
          className="items-center text-center"
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell {...shell}>
      {!preview ? (
        <InstallHintDock
          storageKey={`aura-install-dismiss-c-${params.token}`}
        />
      ) : null}
      <ContractPublicView
        title={title}
        body={body}
        studioName={studioName}
        status={status}
        preview={preview}
        signerName={signerName}
        signedAt={signedAt}
        signedDate={signedDate}
        onSign={async (input) => {
          const res = await fetch(`/api/public/contracts/${params.token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return {
              ok: false as const,
              error: String(data.error || "Could not sign"),
            };
          }
          return { ok: true as const, signedAt: String(data.signedAt) };
        }}
      />
    </PublicShell>
  );
}

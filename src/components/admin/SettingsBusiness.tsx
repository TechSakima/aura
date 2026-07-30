"use client";

import { FormEvent, useEffect, useState } from "react";
import { PartnerListEditor } from "@/components/admin/ListEditor";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  useToast,
} from "@/components/ui";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import type { PrintPartner } from "@/lib/types";

export function SettingsBusiness() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [printPartners, setPrintPartners] = useState<PrintPartner[]>([]);
  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/studio");
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        push("Could not load business profile", "danger");
        return;
      }
      const data = await res.json();
      setWebsite(data.studio.website || "");
      setPhone(data.studio.phone || "");
      setAddressLine1(data.studio.addressLine1 || "");
      setAddressLine2(data.studio.addressLine2 || "");
      setCity(data.studio.city || "");
      setRegion(data.studio.region || "");
      setPostalCode(data.studio.postalCode || "");
      setCountry(data.studio.country || "");
      setPrintPartners(data.studio.printPartners || []);
      setDirty(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [push]);

  function markDirty() {
    setDirty(true);
  }

  async function saveBusiness(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "business",
        website,
        phone,
        addressLine1,
        addressLine2,
        city,
        region,
        postalCode,
        country,
        printPartners,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    setDirty(false);
    push("Business saved", "success");
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading business…" />;
  }

  return (
    <Card className="min-w-0 p-5">
      <h2 className="mb-1 font-display text-2xl">Business</h2>
      <p className="mb-4 text-sm text-muted">
        Contact details and print partners.
      </p>
      <form onSubmit={saveBusiness} className="space-y-4">
        <Field>
          <Label htmlFor="biz-phone">Phone</Label>
          <Input
            id="biz-phone"
            type="tel"
            value={phone}
            autoComplete="tel"
            onChange={(e) => {
              setPhone(e.target.value);
              markDirty();
            }}
          />
        </Field>
        <Field>
          <Label htmlFor="biz-web">Website</Label>
          <Input
            id="biz-web"
            value={website}
            autoComplete="url"
            onChange={(e) => {
              setWebsite(e.target.value);
              markDirty();
            }}
            placeholder="https://yourstudio.com"
          />
        </Field>
        <Field>
          <Label htmlFor="biz-addr1">Address</Label>
          <Input
            id="biz-addr1"
            value={addressLine1}
            autoComplete="address-line1"
            onChange={(e) => {
              setAddressLine1(e.target.value);
              markDirty();
            }}
            placeholder="Street"
          />
          <Input
            id="biz-addr2"
            className="mt-2"
            value={addressLine2}
            autoComplete="address-line2"
            onChange={(e) => {
              setAddressLine2(e.target.value);
              markDirty();
            }}
            placeholder="Apt, suite, unit"
          />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input
              value={city}
              autoComplete="address-level2"
              onChange={(e) => {
                setCity(e.target.value);
                markDirty();
              }}
              placeholder="City"
            />
            <Input
              value={region}
              autoComplete="address-level1"
              onChange={(e) => {
                setRegion(e.target.value);
                markDirty();
              }}
              placeholder="State"
            />
            <Input
              value={postalCode}
              autoComplete="postal-code"
              onChange={(e) => {
                setPostalCode(e.target.value);
                markDirty();
              }}
              placeholder="ZIP"
            />
          </div>
          <Input
            id="biz-country"
            className="mt-2"
            value={country}
            autoComplete="country-name"
            onChange={(e) => {
              setCountry(e.target.value);
              markDirty();
            }}
            placeholder="Country"
          />
        </Field>

        <PartnerListEditor
          partners={printPartners}
          onChange={(next) => {
            setPrintPartners(next);
            markDirty();
          }}
        />

        <Button
          type="submit"
          pending={saving}
          pendingLabel="Saving…"
          className="w-full sm:w-auto"
        >
          Save business
        </Button>
      </form>
    </Card>
  );
}

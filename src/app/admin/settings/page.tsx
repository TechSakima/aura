"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartnerListEditor } from "@/components/admin/ListEditor";
import {
  Button,
  Card,
  Field,
  FileUploadButton,
  Input,
  Label,
  PageHeader,
  Select,
  Textarea,
  useConfirm,
  useToast,
  useUploadSession,
} from "@/components/ui";
import { resolveMediaUrl } from "@/lib/media-url";
import type {
  PrintPartner,
  WatermarkPosition,
  WatermarkPreset,
} from "@/lib/types";

export default function SettingsPage() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const router = useRouter();
  const uploadSession = useUploadSession();
  const [name, setName] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [timeZone, setTimeZone] = useState("America/Denver");
  const [dateFormat, setDateFormat] = useState("mm/dd/yyyy");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [coverLogoUrl, setCoverLogoUrl] = useState("");
  const [fontPreset, setFontPreset] = useState<"sans" | "serif" | "display">(
    "sans",
  );
  const [accent, setAccent] = useState("#1D1D1D");
  const [background, setBackground] = useState("#F3F3F3");
  const [homepageEnabled, setHomepageEnabled] = useState(false);
  const [homepageSlug, setHomepageSlug] = useState("");
  const [homepageBio, setHomepageBio] = useState("");
  const [homepagePassword, setHomepagePassword] = useState("");
  const [homepageHasPassword, setHomepageHasPassword] = useState(false);
  const [homepageClearPassword, setHomepageClearPassword] = useState(false);
  const [showBiography, setShowBiography] = useState(true);
  const [showSocialLinks, setShowSocialLinks] = useState(true);
  const [showWebsite, setShowWebsite] = useState(false);
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showBooking, setShowBooking] = useState(true);
  const [homepageLayout, setHomepageLayout] = useState<
    "masonry" | "grid" | "list"
  >("masonry");
  const [socialLinks, setSocialLinks] = useState<
    { label: string; url: string }[]
  >([]);
  const [homepageGalleries, setHomepageGalleries] = useState<
    {
      id: string;
      title: string;
      status: string;
      showOnHomepage?: boolean;
      publicToken?: string;
    }[]
  >([]);
  const [savingStudio, setSavingStudio] = useState(false);
  const [homepageSort, setHomepageSort] = useState<
    "created_desc" | "created_asc" | "title_asc"
  >("created_desc");
  const [gcalConnected, setGcalConnected] = useState(false);
  const [prefs, setPrefs] = useState({
    emailQuoteAccepted: true,
    emailPaymentReceived: true,
    emailBookingSubmitted: true,
    emailClientQuote: true,
    emailClientGallery: true,
    emailClientPayment: true,
    emailClientBooking: true,
  });
  const [defaultWatermarkPresetId, setDefaultWatermarkPresetId] = useState("");
  const [printPartners, setPrintPartners] = useState<PrintPartner[]>([]);
  const [presets, setPresets] = useState<WatermarkPreset[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wmName, setWmName] = useState("Studio mark");
  const [wmText, setWmText] = useState("AURA");
  const [wmMode, setWmMode] = useState<"text" | "image">("text");
  const [wmPosition, setWmPosition] =
    useState<WatermarkPosition>("bottom-right");
  const [wmOpacity, setWmOpacity] = useState("0.35");
  const [wmFile, setWmFile] = useState<File | null>(null);
  const [wmBusy, setWmBusy] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  async function load() {
    const res = await fetch("/api/studio");
    if (!res.ok) {
      push("Could not load settings", "danger");
      return;
    }
    const data = await res.json();
    setName(data.studio.name);
    setBrandTagline(data.studio.brandTagline || "");
    setOwnerEmail(data.studio.ownerEmail || "");
    setLogoUrl(data.studio.logoUrl || "");
    setTimeZone(data.studio.timeZone || "America/Denver");
    setDateFormat(data.studio.dateFormat || "mm/dd/yyyy");
    setWebsite(data.studio.website || "");
    setPhone(data.studio.phone || "");
    setAddressLine1(data.studio.addressLine1 || "");
    setCity(data.studio.city || "");
    setRegion(data.studio.region || "");
    setPostalCode(data.studio.postalCode || "");
    setCoverLogoUrl(data.studio.coverLogoUrl || "");
    setFontPreset(data.studio.theme?.fontPreset || "sans");
    setAccent(data.studio.theme?.accent || "#1D1D1D");
    setBackground(data.studio.theme?.background || "#F3F3F3");
    setHomepageEnabled(Boolean(data.studio.homepage?.enabled));
    setHomepageSlug(data.studio.homepage?.slug || "");
    setHomepageBio(data.studio.homepage?.biography || "");
    setHomepageHasPassword(Boolean(data.studio.homepage?.hasPassword));
    setHomepagePassword("");
    setHomepageClearPassword(false);
    setShowBiography(data.studio.homepage?.showBiography !== false);
    setShowSocialLinks(data.studio.homepage?.showSocialLinks !== false);
    setShowWebsite(Boolean(data.studio.homepage?.showWebsite));
    setShowEmail(data.studio.homepage?.showEmail !== false);
    setShowPhone(data.studio.homepage?.showPhone !== false);
    setShowAddress(data.studio.homepage?.showAddress !== false);
    setShowBooking(data.studio.homepage?.showBooking !== false);
    setHomepageLayout(data.studio.homepage?.layout || "masonry");
    setSocialLinks(data.studio.socialLinks || []);
    setHomepageSort(data.studio.homepage?.sortOrder || "created_desc");
    setGcalConnected(Boolean(data.studio.googleCalendarConnected));
    setPrefs({
      emailQuoteAccepted: data.studio.notificationPrefs?.emailQuoteAccepted !== false,
      emailPaymentReceived:
        data.studio.notificationPrefs?.emailPaymentReceived !== false,
      emailBookingSubmitted:
        data.studio.notificationPrefs?.emailBookingSubmitted !== false,
      emailClientQuote: data.studio.notificationPrefs?.emailClientQuote !== false,
      emailClientGallery:
        data.studio.notificationPrefs?.emailClientGallery !== false,
      emailClientPayment:
        data.studio.notificationPrefs?.emailClientPayment !== false,
      emailClientBooking:
        data.studio.notificationPrefs?.emailClientBooking !== false,
    });
    setDefaultWatermarkPresetId(data.studio.defaultWatermarkPresetId || "");
    setPrintPartners(data.studio.printPartners || []);
    setPresets(data.watermarkPresets || []);

    const gRes = await fetch("/api/galleries");
    if (gRes.ok) {
      const gData = await gRes.json();
      setHomepageGalleries(gData.galleries || []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetWmForm() {
    setEditingId(null);
    setWmName("Studio mark");
    setWmText("AURA");
    setWmMode("text");
    setWmPosition("bottom-right");
    setWmOpacity("0.35");
    setWmFile(null);
  }

  function startEdit(preset: WatermarkPreset) {
    setEditingId(preset.id);
    setWmName(preset.name);
    setWmText(preset.text || "");
    setWmMode(preset.mode);
    setWmPosition(preset.position || "bottom-right");
    setWmOpacity(String(preset.opacity ?? 0.35));
    setWmFile(null);
  }

  async function saveStudio(e?: FormEvent) {
    e?.preventDefault();
    setSavingStudio(true);
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        brandTagline,
        defaultWatermarkPresetId,
        printPartners,
        timeZone,
        dateFormat,
        website,
        phone,
        addressLine1,
        city,
        region,
        postalCode,
        coverLogoUrl,
        socialLinks,
        theme: { background, accent, fontPreset },
        homepage: {
          enabled: homepageEnabled,
          slug: homepageSlug,
          biography: homepageBio,
          showBiography,
          showSocialLinks,
          showWebsite,
          showEmail,
          showPhone,
          showAddress,
          showBooking,
          layout: homepageLayout,
          sortOrder: homepageSort,
          ...(homepagePassword.trim()
            ? { password: homepagePassword.trim() }
            : {}),
          ...(homepageClearPassword ? { clearPassword: true } : {}),
        },
        notificationPrefs: prefs,
      }),
    });
    setSavingStudio(false);
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    setHomepagePassword("");
    setHomepageClearPassword(false);
    if (homepagePassword.trim() || homepageClearPassword) {
      setHomepageHasPassword(
        homepageClearPassword ? false : Boolean(homepagePassword.trim()) || homepageHasPassword,
      );
    }
    push("Settings saved", "success");
  }

  async function toggleHomepageGallery(id: string, show: boolean) {
    setHomepageGalleries((prev) =>
      prev.map((g) => (g.id === id ? { ...g, showOnHomepage: show } : g)),
    );
    const res = await fetch(`/api/galleries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showOnHomepage: show }),
    });
    if (!res.ok) {
      push("Could not update collection", "danger");
      void load();
      return;
    }
    push(show ? "Shown on homepage" : "Hidden from homepage", "success");
  }

  async function connectGoogle() {
    const res = await fetch("/api/integrations/google", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      push("Could not connect", "danger");
      return;
    }
    if (data.authUrl) {
      window.location.href = data.authUrl as string;
      return;
    }
    setGcalConnected(Boolean(data.connected));
    push(data.note || "Google Calendar updated", "success");
  }

  async function uploadLogo(files: File[]) {
    const file = files[0];
    if (!file) return;
    await uploadSession.runUpload({
      title: "Uploading logo",
      files: [file],
      uploadFile: async (f) => {
        const form = new FormData();
        form.set("file", f);
        const res = await fetch("/api/studio/logo", {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        setLogoUrl(data.logoUrl);
      },
    });
  }

  async function saveWatermark(e: FormEvent) {
    e.preventDefault();
    if (wmMode === "image" && !editingId && !wmFile) {
      push("Choose an image for this watermark", "danger");
      return;
    }
    setWmBusy(true);
    const form = new FormData();
    form.set("name", wmName);
    form.set("mode", wmMode);
    form.set("text", wmText);
    form.set("position", wmPosition);
    form.set("opacity", wmOpacity);
    form.set("scale", "0.14");
    if (wmFile) form.set("file", wmFile);

    const res = await fetch(
      editingId ? `/api/watermarks/${editingId}` : "/api/watermarks",
      { method: editingId ? "PATCH" : "POST", body: form },
    );
    setWmBusy(false);
    if (!res.ok) {
      push(editingId ? "Could not update watermark" : "Could not add watermark", "danger");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (editingId && data.photosUpdated != null) {
      push(
        `Watermark updated · refreshed ${data.photosUpdated} photo${
          data.photosUpdated === 1 ? "" : "s"
        }`,
        "success",
      );
    } else {
      push(editingId ? "Watermark updated" : "Watermark added", "success");
    }
    resetWmForm();
    await load();
  }

  async function deleteWatermark(preset: WatermarkPreset) {
    const ok = await confirm({
      title: "Delete watermark?",
      message: `“${preset.name}” will be removed.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/watermarks/${preset.id}`, { method: "DELETE" });
    if (!res.ok) {
      push("Could not delete watermark", "danger");
      return;
    }
    if (editingId === preset.id) resetWmForm();
    if (defaultWatermarkPresetId === preset.id) {
      setDefaultWatermarkPresetId("");
    }
    push("Watermark deleted", "success");
    await load();
  }

  return (
    <div>
      {uploadSession.dialog}
      <PageHeader
        eyebrow="Studio"
        title="Settings"
        description="Branding, business profile, homepage, and integrations."
        actions={
          <Button
            tone="ghost"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/admin/login");
            }}
          >
            Log out
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-2xl">Studio</h2>
          <form onSubmit={saveStudio} className="space-y-4">
            <Field>
              <Label htmlFor="name">Studio name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <Label htmlFor="tag">Tagline</Label>
              <Input
                id="tag"
                value={brandTagline}
                onChange={(e) => setBrandTagline(e.target.value)}
              />
            </Field>
            {ownerEmail ? (
              <Field>
                <Label htmlFor="email">Owner email</Label>
                <Input id="email" type="email" value={ownerEmail} disabled />
              </Field>
            ) : null}
            <Field>
              <Label>Studio logo</Label>
              {resolveMediaUrl(logoUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(logoUrl)}
                  alt=""
                  className="mb-2 h-16 w-auto object-contain"
                />
              ) : null}
              <FileUploadButton
                label={logoUrl ? "Replace logo" : "Upload logo"}
                tone="neutral"
                disabled={uploadSession.busy}
                onFiles={(files) => void uploadLogo(files)}
              />
            </Field>
            <Field>
              <Label htmlFor="coverLogo">Cover / inverted logo URL</Label>
              <Input
                id="coverLogo"
                value={coverLogoUrl}
                onChange={(e) => setCoverLogoUrl(e.target.value)}
                placeholder="Optional transparent PNG for dark covers"
              />
            </Field>
            <Field>
              <Label htmlFor="wm">Default watermark</Label>
              <Select
                id="wm"
                value={defaultWatermarkPresetId}
                onChange={(e) => setDefaultWatermarkPresetId(e.target.value)}
              >
                {presets.length === 0 ? (
                  <option value="">No watermarks yet</option>
                ) : (
                  presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.mode})
                    </option>
                  ))
                )}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="tz">Time zone</Label>
              <Input
                id="tz"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                placeholder="America/Denver"
              />
            </Field>
            <Field>
              <Label htmlFor="df">Date format</Label>
              <Select
                id="df"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                <option value="mm/dd/yyyy">mm/dd/yyyy</option>
                <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                <option value="yyyy-mm-dd">yyyy-mm-dd</option>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="web">Website</Label>
              <Input
                id="web"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourstudio.com"
              />
            </Field>
            <div className="space-y-3">
              <Label>Social links</Label>
              {socialLinks.map((row, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
                >
                  <Input
                    value={row.label}
                    onChange={(e) =>
                      setSocialLinks((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, label: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder="Instagram"
                  />
                  <Input
                    value={row.url}
                    onChange={(e) =>
                      setSocialLinks((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, url: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder="https://instagram.com/…"
                  />
                  <Button
                    type="button"
                    tone="ghost"
                    className="min-h-11"
                    onClick={() =>
                      setSocialLinks((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                tone="neutral"
                className="min-h-11"
                onClick={() =>
                  setSocialLinks((prev) => [...prev, { label: "", url: "" }])
                }
              >
                Add social link
              </Button>
            </div>
            <Field>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="addr">Address</Label>
              <Input
                id="addr"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street"
              />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
                <Input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="State"
                />
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="ZIP"
                />
              </div>
            </Field>
            <Field>
              <Label htmlFor="font">Font preset</Label>
              <Select
                id="font"
                value={fontPreset}
                onChange={(e) =>
                  setFontPreset(e.target.value as "sans" | "serif" | "display")
                }
              >
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
                <option value="display">Display</option>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="accent">Accent color</Label>
              <Input
                id="accent"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="bg">Background color</Label>
              <Input
                id="bg"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
              />
            </Field>
            <PartnerListEditor partners={printPartners} onChange={setPrintPartners} />
            <Button type="submit" pending={savingStudio} pendingLabel="Saving…">
              Save studio
            </Button>
          </form>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Homepage</h2>
              <p className="mt-1 text-sm text-muted">
                Public collections page for your studio.
              </p>
            </div>
            {homepageEnabled && homepageSlug ? (
              <Button
                type="button"
                tone="accent"
                size="sm"
                onClick={() =>
                  window.open(`/h/${homepageSlug}`, "_blank", "noopener")
                }
              >
                View site
              </Button>
            ) : null}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={homepageEnabled}
                  onChange={(e) => setHomepageEnabled(e.target.checked)}
                />
                Homepage on
              </label>

              <Field>
                <Label htmlFor="slug">Homepage URL</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="slug"
                    value={homepageSlug}
                    onChange={(e) => setHomepageSlug(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    tone="neutral"
                    size="sm"
                    disabled={!homepageSlug}
                    onClick={async () => {
                      const url = `${window.location.origin}/h/${homepageSlug}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        push("Link copied", "success");
                      } catch {
                        push("Could not copy", "danger");
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted">/h/{homepageSlug || "…"}</p>
              </Field>

              <Field>
                <Label htmlFor="hpw">Homepage password</Label>
                <Input
                  id="hpw"
                  type="password"
                  value={homepagePassword}
                  onChange={(e) => {
                    setHomepagePassword(e.target.value);
                    if (e.target.value) setHomepageClearPassword(false);
                  }}
                  placeholder={
                    homepageHasPassword ? "••••••••" : "Add a password"
                  }
                />
                {homepageHasPassword ? (
                  <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={homepageClearPassword}
                      onChange={(e) => {
                        setHomepageClearPassword(e.target.checked);
                        if (e.target.checked) setHomepagePassword("");
                      }}
                    />
                    Remove password
                  </label>
                ) : null}
              </Field>

              <Field>
                <Label htmlFor="bio">Biography</Label>
                <Textarea
                  id="bio"
                  value={homepageBio}
                  maxLength={500}
                  rows={4}
                  onChange={(e) => setHomepageBio(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted">
                  {homepageBio.length}/500
                </p>
              </Field>

              <div>
                <Label>Homepage info</Label>
                <ul className="mt-2 space-y-2 text-sm">
                  {(
                    [
                      ["showBiography", "Biography", showBiography, setShowBiography],
                      [
                        "showSocialLinks",
                        "Social links",
                        showSocialLinks,
                        setShowSocialLinks,
                      ],
                      ["showWebsite", "Website", showWebsite, setShowWebsite],
                      ["showEmail", "Contact email", showEmail, setShowEmail],
                      ["showPhone", "Phone number", showPhone, setShowPhone],
                      [
                        "showAddress",
                        "Business address",
                        showAddress,
                        setShowAddress,
                      ],
                      [
                        "showBooking",
                        "Book a session button",
                        showBooking,
                        setShowBooking,
                      ],
                    ] as const
                  ).map(([key, label, checked, setter]) => (
                    <li key={key}>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setter(e.target.checked)}
                        />
                        {label}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <Field>
                <Label htmlFor="hp-layout">Portfolio layout</Label>
                <Select
                  id="hp-layout"
                  value={homepageLayout}
                  onChange={(e) =>
                    setHomepageLayout(
                      e.target.value as "masonry" | "grid" | "list",
                    )
                  }
                >
                  <option value="masonry">Masonry</option>
                  <option value="grid">Grid</option>
                  <option value="list">List</option>
                </Select>
              </Field>

              <Field>
                <Label htmlFor="sort">Collection sort order</Label>
                <Select
                  id="sort"
                  value={homepageSort}
                  onChange={(e) =>
                    setHomepageSort(
                      e.target.value as
                        | "created_desc"
                        | "created_asc"
                        | "title_asc",
                    )
                  }
                >
                  <option value="created_desc">Date created: New to Old</option>
                  <option value="created_asc">Date created: Old to New</option>
                  <option value="title_asc">Title: A to Z</option>
                </Select>
              </Field>

              <div className="space-y-3">
                <Label>Collections on homepage</Label>
                <p className="text-xs text-muted">
                  Live galleries only. Turn on to include in the portfolio.
                </p>
                {homepageGalleries.length === 0 ? (
                  <p className="text-sm text-muted">
                    No galleries yet. Create one from a project Delivery step.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {homepageGalleries.map((g) => (
                      <li
                        key={g.id}
                        className="flex flex-wrap items-center justify-between gap-2 border border-line px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{g.title}</p>
                          <p className="text-xs text-muted">{g.status}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <a
                            href={`/admin/galleries/${g.id}`}
                            className="text-xs text-accent"
                          >
                            Design
                          </a>
                          <label className="inline-flex min-h-11 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(g.showOnHomepage)}
                              disabled={g.status !== "live"}
                              onChange={(e) =>
                                void toggleHomepageGallery(
                                  g.id,
                                  e.target.checked,
                                )
                              }
                            />
                            Show
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button
                type="button"
                pending={savingStudio}
                pendingLabel="Saving…"
                onClick={() => void saveStudio()}
              >
                Save homepage
              </Button>
            </div>

            <div className="rounded-lg border border-line bg-canvas/60 p-4">
              <p className="mb-3 text-center text-[10px] uppercase tracking-[0.2em] text-muted">
                Preview
              </p>
              <div className="bg-surface px-4 py-8 text-center shadow-sm">
                <p className="font-display text-2xl tracking-tight">
                  {name || "Studio"}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-3 text-[10px] text-muted">
                  {showEmail ? <span>Email</span> : null}
                  {showAddress ? <span>Location</span> : null}
                  {showPhone ? <span>Phone</span> : null}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-1.5">
                  {[1.2, 0.9, 1.1, 1, 1.3, 0.85].map((a, i) => (
                    <div
                      key={i}
                      className="bg-line"
                      style={{ aspectRatio: String(a) }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 font-display text-2xl">Notifications</h2>
          <p className="mb-4 text-sm text-muted">
            Transactional email via Resend. In-app bell always records events.
          </p>
          <ul className="space-y-3 text-sm">
            {(
              [
                ["emailQuoteAccepted", "Email me when a quote is accepted"],
                ["emailPaymentReceived", "Email me when a payment is received"],
                ["emailBookingSubmitted", "Email me on booking requests"],
                ["emailClientQuote", "Email client when a quote is shared"],
                ["emailClientGallery", "Email client when a gallery goes live"],
                ["emailClientPayment", "Email client a payment receipt"],
                ["emailClientBooking", "Email client booking confirmation"],
              ] as const
            ).map(([key, label]) => (
              <li key={key}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, [key]: e.target.checked }))
                    }
                  />
                  {label}
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Saved with Studio settings.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 font-display text-2xl">Integrations</h2>
          <p className="mb-4 text-sm text-muted">
            {gcalConnected ? "Google Calendar connected." : "Google Calendar"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void connectGoogle()}>
              {gcalConnected ? "Refresh connection" : "Connect Google Calendar"}
            </Button>
            {gcalConnected ? (
              <Button
                type="button"
                tone="neutral"
                onClick={async () => {
                  await fetch("/api/integrations/google", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "disconnect" }),
                  });
                  setGcalConnected(false);
                  push("Disconnected", "success");
                }}
              >
                Disconnect
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-6 p-5">
          <div>
            <h2 className="font-display text-2xl">Watermarks</h2>
            <p className="mt-1 text-sm text-muted">
              Manage presets used on gallery previews.
            </p>
          </div>

          {presets.length === 0 ? (
            <p className="text-sm text-muted">No watermark presets yet.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {presets.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted">
                      {p.mode}
                      {p.mode === "text" && p.text ? ` · “${p.text}”` : ""}
                      {` · ${p.position || "bottom-right"}`}
                      {defaultWatermarkPresetId === p.id ? " · Default" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" tone="ghost" onClick={() => startEdit(p)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      tone="ghost"
                      onClick={() => void deleteWatermark(p)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={saveWatermark} className="space-y-4 border-t border-line pt-5">
            <h3 className="font-display text-xl">
              {editingId ? "Edit watermark" : "Add watermark"}
            </h3>
            <Field>
              <Label htmlFor="wname">Name</Label>
              <Input id="wname" value={wmName} onChange={(e) => setWmName(e.target.value)} />
            </Field>
            <Field>
              <Label htmlFor="mode">Mode</Label>
              <Select
                id="mode"
                value={wmMode}
                onChange={(e) => setWmMode(e.target.value as "text" | "image")}
              >
                <option value="text">Text</option>
                <option value="image">Image file</option>
              </Select>
            </Field>
            {wmMode === "text" ? (
              <Field>
                <Label htmlFor="wtext">Text</Label>
                <Input id="wtext" value={wmText} onChange={(e) => setWmText(e.target.value)} />
              </Field>
            ) : (
              <Field>
                <Label>Image (PNG/SVG)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <FileUploadButton
                    label={
                      wmFile
                        ? "Change image"
                        : editingId
                          ? "Replace image"
                          : "Choose image"
                    }
                    tone="neutral"
                    accept="image/*,.svg"
                    onFiles={(files) => setWmFile(files[0] || null)}
                  />
                  {wmFile ? (
                    <span className="text-sm text-muted">{wmFile.name}</span>
                  ) : editingId ? (
                    <span className="text-sm text-muted">Keeping current image</span>
                  ) : null}
                </div>
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="wmpos">Position</Label>
                <Select
                  id="wmpos"
                  value={wmPosition}
                  onChange={(e) =>
                    setWmPosition(e.target.value as WatermarkPosition)
                  }
                >
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="top-right">Top right</option>
                  <option value="top-left">Top left</option>
                  <option value="center">Center</option>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="wmop">Opacity</Label>
                <Input
                  id="wmop"
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={wmOpacity}
                  onChange={(e) => setWmOpacity(e.target.value)}
                />
              </Field>
            </div>
            <p className="text-sm text-muted">
              Saving an edit refreshes watermarked previews in galleries that
              use this preset.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={wmBusy}>
                {wmBusy
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Add preset"}
              </Button>
              {editingId ? (
                <Button type="button" tone="ghost" onClick={resetWmForm}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ButtonLink, EmptyState, PublicCta } from "@/components/ui";
import { HomepageCollections } from "@/components/public/homepage/HomepageCollections";
import { HomepageContactForm } from "@/components/public/HomepageContactForm";
import { HomepageCoverImage } from "@/components/public/homepage/HomepageCoverImage";
import { SocialLinks } from "@/components/public/SocialLinks";
import { cn } from "@/lib/cn";
import { asHeroVariant } from "@/lib/homepage-modules";
import type {
  HomepageGalleryCard,
  HomepagePayload,
} from "@/lib/homepage-payload";
import { mailtoHref, telHref } from "@/lib/social";
import type { StudioHomepageModule } from "@/lib/types";
import { displayHost } from "@/lib/urls";

type Ctx = {
  studio: HomepagePayload["studio"];
  galleries: HomepageGalleryCard[];
  featuredGallery?: HomepageGalleryCard | null;
  /** Admin builder / preview — show booking setup empty states (AURA-232) */
  preview?: boolean;
};

function HeroCta({
  href,
  surface,
}: {
  href?: string;
  surface: "media" | "canvas";
}) {
  if (!href) return null;
  return (
    <PublicCta href={href} surface={surface} className="mt-6">
      Book a session
    </PublicCta>
  );
}

function HeroMark({
  studio,
  showLogo,
  showName,
  onMedia,
  align = "center",
}: {
  studio: Ctx["studio"];
  showLogo: boolean;
  showName: boolean;
  onMedia?: boolean;
  align?: "center" | "start";
}) {
  const logo = showLogo && studio.logoUrl;
  if (!logo && !showName) return null;
  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-5",
        align === "center" ? "items-center text-center" : "items-start text-left",
      )}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={studio.logoUrl}
          alt=""
          className={cn(
            "h-14 w-auto max-w-full object-contain",
            onMedia && "shadow-on-media",
          )}
        />
      ) : null}
      {showName ? (
        <h1
          className={cn(
            "max-w-full break-words font-display text-4xl font-semibold uppercase tracking-[0.14em] @sm:text-5xl",
            onMedia ? "text-on-media" : "text-ink",
          )}
        >
          {studio.name}
        </h1>
      ) : null}
    </div>
  );
}

function HeroModule({
  module,
  studio,
}: {
  module: Extract<StudioHomepageModule, { type: "hero" }>;
  studio: Ctx["studio"];
}) {
  const variant = asHeroVariant(module.props.variant);
  const showLogo = module.props.showLogo !== false;
  const showName = module.props.showName !== false;
  const showCta = Boolean(module.props.showCta) && Boolean(studio.bookingHref);
  const ctaHref = showCta ? studio.bookingHref : undefined;
  const cover = studio.coverImageUrl;

  if (variant === "fullBleed") {
    if (!cover) {
      return (
        <section className="shell-pad mx-auto max-w-[var(--public-max)] pt-[max(3.5rem,var(--safe-inset-top))] text-center @sm:pt-[max(5rem,var(--safe-inset-top))]">
          <HeroMark
            studio={studio}
            showLogo={showLogo}
            showName={showName}
            align="center"
          />
          <HeroCta href={ctaHref} surface="canvas" />
        </section>
      );
    }
    return (
      <section className="hero-fill-70 relative w-full overflow-hidden bg-scrim-strong text-on-media @sm:hero-fill-78">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-scrim-strong via-scrim/50 to-scrim/20"
          aria-hidden
        />
        <div className="hero-fill-70 relative z-10 flex flex-col items-center justify-end shell-pad pb-[calc(var(--install-hint-clearance,0px)+max(2rem,var(--safe-inset-bottom)))] pt-16 text-center @sm:hero-fill-78 @sm:pl-[max(2.5rem,var(--safe-inset-left))] @sm:pr-[max(2.5rem,var(--safe-inset-right))] @sm:pb-[calc(var(--install-hint-clearance,0px)+4rem)]">
          <HeroMark
            studio={studio}
            showLogo={showLogo}
            showName={showName}
            onMedia
            align="center"
          />
          <HeroCta href={ctaHref} surface="media" />
        </div>
      </section>
    );
  }

  if (variant === "split") {
    return (
      <section className="grid min-h-0 min-w-0 grid-cols-1 overflow-x-clip @lg:hero-fill-70 @lg:grid-cols-2">
        <div className="hero-fill-42 relative min-w-0 overflow-hidden bg-scrim @lg:min-h-0">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-surface-elevated" aria-hidden />
          )}
          {cover ? (
            <div
              className="absolute inset-0 bg-scrim/30"
              aria-hidden
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-2 shell-pad py-12 @sm:py-16 @sm:pl-[max(2.5rem,var(--safe-inset-left))] @sm:pr-[max(2.5rem,var(--safe-inset-right))] @lg:pl-[max(3.5rem,var(--safe-inset-left))] @lg:pr-[max(3.5rem,var(--safe-inset-right))]">
          <HeroMark
            studio={studio}
            showLogo={showLogo}
            showName={showName}
            align="start"
          />
          <HeroCta href={ctaHref} surface="canvas" />
        </div>
      </section>
    );
  }

  if (variant === "type") {
    if (!showName && !showCta) return null;
    return (
      <section className="shell-pad mx-auto max-w-[var(--public-max)] pt-[max(4rem,var(--safe-inset-top))] pb-4 text-center @sm:pt-[max(6rem,var(--safe-inset-top))]">
        {showName ? (
          <h1 className="max-w-full break-words font-display text-5xl font-medium tracking-tight text-ink @sm:text-6xl @md:text-7xl">
            {studio.name}
          </h1>
        ) : null}
        <HeroCta href={ctaHref} surface="canvas" />
      </section>
    );
  }

  /* lockup — logo + name (legacy default) */
  const logo = showLogo && studio.logoUrl;
  if (!logo && !showName && !showCta) return null;
  return (
    <section className="shell-pad mx-auto max-w-[var(--public-max)] pt-[max(3.5rem,var(--safe-inset-top))] text-center @sm:pt-[max(5rem,var(--safe-inset-top))]">
      <HeroMark
        studio={studio}
        showLogo={showLogo}
        showName={showName}
        align="center"
      />
      <HeroCta href={ctaHref} surface="canvas" />
    </section>
  );
}

function BioModule({ studio }: { studio: Ctx["studio"] }) {
  if (!studio.biography?.trim()) return null;
  return (
    <section className="shell-pad mx-auto max-w-[var(--public-max)] pt-5 text-center">
      <p className="mx-auto max-w-xl text-muted">{studio.biography}</p>
    </section>
  );
}

function ContactModule({
  module,
  studio,
}: {
  module: Extract<StudioHomepageModule, { type: "contact" }>;
  studio: Ctx["studio"];
}) {
  const p = module.props;
  const email = p.showEmail ? studio.email : undefined;
  const phone = p.showPhone ? studio.phone : undefined;
  /** Form is primary when contact form or email is on — mailto alone is not enough (AURA-307). */
  const showForm = Boolean(p.showContactForm || p.showEmail);
  const addressLines =
    p.showAddress && studio.addressLines?.length
      ? studio.addressLines
      : p.showAddress && studio.address
        ? [studio.address]
        : [];
  const maps = p.showAddress ? studio.mapsHref : undefined;
  const website = p.showWebsite ? studio.website : undefined;
  const social =
    p.showSocialLinks && studio.socialLinks?.length
      ? studio.socialLinks
      : [];
  if (
    !email &&
    !phone &&
    !addressLines.length &&
    !website &&
    !social.length &&
    !showForm
  ) {
    return null;
  }

  const addressBlock =
    addressLines.length > 0 ? (
      <address className="not-italic text-sm text-muted">
        {addressLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </address>
    ) : null;

  return (
    <section className="shell-pad mx-auto max-w-[var(--public-max)] space-y-5 pt-5 text-center">
      {showForm ? (
        <HomepageContactForm
          studioName={studio.name}
          slug={studio.slug}
        />
      ) : null}

      <div className="flex flex-col items-center gap-3">
        {showForm && (email || phone) ? (
          <div className="flex flex-wrap items-center justify-center gap-1">
            {email ? (
              <ButtonLink
                href={mailtoHref(email)}
                tone="ghost"
                size="sm"
                className="text-muted hover:text-ink"
              >
                Email
              </ButtonLink>
            ) : null}
            {email && phone ? (
              <span className="text-line" aria-hidden>
                ·
              </span>
            ) : null}
            {phone ? (
              <ButtonLink
                href={telHref(phone)}
                tone="ghost"
                size="sm"
                className="text-muted hover:text-ink"
              >
                Call
              </ButtonLink>
            ) : null}
          </div>
        ) : (
          <>
            {email ? (
              <ButtonLink
                href={mailtoHref(email)}
                tone="ghost"
                size="sm"
                className="max-w-full break-all text-accent"
              >
                {email}
              </ButtonLink>
            ) : null}
            {phone ? (
              <ButtonLink
                href={telHref(phone)}
                tone="ghost"
                size="sm"
                className="text-accent"
              >
                {phone}
              </ButtonLink>
            ) : null}
          </>
        )}
        {addressBlock && maps ? (
          <a
            href={maps}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 flex-col items-center justify-center no-underline"
          >
            {addressBlock}
          </a>
        ) : (
          addressBlock
        )}
        {website ? (
          <a
            href={website}
            className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
            target="_blank"
            rel="noreferrer"
          >
            {displayHost(website)}
          </a>
        ) : null}
      </div>
      {social.length > 0 ? (
        <SocialLinks
          links={social}
          treatment={studio.socialTreatment || "text"}
        />
      ) : null}
    </section>
  );
}

function BookingCtaModule({
  studio,
  preview,
}: {
  studio: Ctx["studio"];
  preview?: boolean;
}) {
  /* Respect showBooking — module only renders when enabled; still gate dead links */
  if (studio.showBooking === false) return null;

  if (studio.bookingReady && studio.bookingHref) {
    return (
      <section className="shell-pad mx-auto max-w-[var(--public-max)] pt-8 text-center">
        <PublicCta href={studio.bookingHref} surface="canvas">
          Book a session
        </PublicCta>
      </section>
    );
  }

  if (!preview) return null;

  const reason = studio.bookingBlockReason;
  if (reason === "no_slug") {
    return (
      <section className="shell-pad mx-auto max-w-[var(--public-max)] pt-8">
        <EmptyState
          variant="inline"
          title="Set a site URL"
          description="Booking link needs a site URL first."
          action={
            <ButtonLink
              href="/admin/settings/website"
              tone="neutral"
              className="min-h-11"
            >
              Website settings
            </ButtonLink>
          }
        />
      </section>
    );
  }

  if (reason === "no_session_types") {
    return (
      <section className="shell-pad mx-auto max-w-[var(--public-max)] pt-8">
        <EmptyState
          variant="inline"
          title="Add a session type"
          description="Required for the book link."
          action={
            <ButtonLink
              href="/admin/settings/booking"
              tone="neutral"
              className="min-h-11"
            >
              Session types
            </ButtonLink>
          }
        />
      </section>
    );
  }

  return null;
}

function CollectionsModule({
  module,
  galleries,
}: {
  module: Extract<StudioHomepageModule, { type: "collections" }>;
  galleries: HomepageGalleryCard[];
}) {
  return (
    <HomepageCollections
      layout={module.props.layout || "masonry"}
      galleries={galleries}
    />
  );
}

function FeaturedGalleryModule({
  gallery,
}: {
  gallery?: HomepageGalleryCard | null;
}) {
  if (!gallery) return null;
  return (
    <section className="shell-pad mx-auto max-w-[var(--public-max)] py-10">
      <Link href={`/g/${gallery.token}`} className="block no-underline">
        <div className="overflow-hidden bg-line">
          {gallery.coverThumbUrl || gallery.coverPhotoUrl ? (
            <HomepageCoverImage
              gallery={gallery}
              layout="featured"
              className="aspect-[16/10] w-full"
            />
          ) : (
            <div className="aspect-[16/10] bg-line" />
          )}
        </div>
        <p className="mt-4 max-w-full break-words text-center font-sans text-sm font-medium uppercase tracking-[0.12em] text-ink">
          {gallery.title}
        </p>
      </Link>
    </section>
  );
}

function CustomLinksModule({
  module,
}: {
  module: Extract<StudioHomepageModule, { type: "customLinks" }>;
}) {
  const links = module.props.links || [];
  if (!links.length) return null;
  return (
    <section className="shell-pad mx-auto max-w-[var(--public-max)] py-8">
      <ul className="flex flex-col items-center gap-3">
        {links.map((link) => (
          <li key={link.id} className="w-full max-w-sm">
            <ButtonLink
              href={link.url}
              tone="neutral"
              className="w-full min-h-11"
              target="_blank"
              rel="noreferrer"
            >
              {link.label}
            </ButtonLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FooterModule({
  module,
  studio,
}: {
  module: Extract<StudioHomepageModule, { type: "footer" }>;
  studio: Ctx["studio"];
}) {
  const showName = module.props.showStudioName !== false;
  const social =
    module.props.showSocialLinks && studio.socialLinks?.length
      ? studio.socialLinks
      : [];
  if (!showName && !social.length) return null;
  return (
    <footer className="shell-pad mx-auto max-w-[var(--public-max)] border-t border-line py-10 pb-[calc(var(--install-hint-clearance,0px)+max(2.5rem,var(--safe-inset-bottom)))] text-center">
      {showName ? (
        <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted">
          {studio.name}
        </p>
      ) : null}
      {social.length > 0 ? (
        <div className="mt-3">
          <SocialLinks
            links={social}
            treatment={studio.socialTreatment || "text"}
          />
        </div>
      ) : null}
    </footer>
  );
}

function renderModule(module: StudioHomepageModule, ctx: Ctx) {
  switch (module.type) {
    case "hero":
      return <HeroModule module={module} studio={ctx.studio} />;
    case "bio":
      return <BioModule studio={ctx.studio} />;
    case "contact":
      return <ContactModule module={module} studio={ctx.studio} />;
    case "bookingCta":
      return (
        <BookingCtaModule studio={ctx.studio} preview={ctx.preview} />
      );
    case "collections":
      return (
        <CollectionsModule module={module} galleries={ctx.galleries} />
      );
    case "featuredGallery":
      return <FeaturedGalleryModule gallery={ctx.featuredGallery} />;
    case "customLinks":
      return <CustomLinksModule module={module} />;
    case "footer":
      return <FooterModule module={module} studio={ctx.studio} />;
    default:
      return null;
  }
}

/** Ordered module loop — unknown types ignored (AURA-224). */
export function HomepageModuleList({
  data,
  preview = false,
}: {
  data: HomepagePayload;
  /** Admin builder — booking setup empty states (AURA-232) */
  preview?: boolean;
}) {
  const modules = Array.isArray(data.modules) ? data.modules : [];
  const ctx: Ctx = {
    studio: data.studio,
    galleries: data.galleries || [],
    featuredGallery: data.featuredGallery,
    preview,
  };

  if (!modules.length) {
    /* Legacy payload without modules — fall back to classic stack */
    return (
      <>
        {renderModule(
          {
            id: "legacy-hero",
            type: "hero",
            enabled: true,
            props: { showLogo: true, showName: true },
          },
          ctx,
        )}
        {data.studio.biography
          ? renderModule(
              {
                id: "legacy-bio",
                type: "bio",
                enabled: true,
                props: {} as Record<string, never>,
              },
              ctx,
            )
          : null}
        {renderModule(
          {
            id: "legacy-contact",
            type: "contact",
            enabled: true,
            props: {
              showEmail: Boolean(data.studio.email),
              showPhone: Boolean(data.studio.phone),
              showAddress: Boolean(data.studio.address),
              showWebsite: Boolean(data.studio.website),
              showSocialLinks: Boolean(data.studio.socialLinks?.length),
              showContactForm: Boolean(data.studio.showContactForm),
            },
          },
          ctx,
        )}
        {data.studio.showBooking
          ? renderModule(
              {
                id: "legacy-booking",
                type: "bookingCta",
                enabled: true,
                props: {} as Record<string, never>,
              },
              ctx,
            )
          : null}
        {renderModule(
          {
            id: "legacy-collections",
            type: "collections",
            enabled: true,
            props: {
              layout: data.studio.layout || "masonry",
              sortOrder: "created_desc",
            },
          },
          ctx,
        )}
      </>
    );
  }

  return (
    <>
      {modules.map((module) => (
        <div key={module.id}>{renderModule(module, ctx)}</div>
      ))}
    </>
  );
}

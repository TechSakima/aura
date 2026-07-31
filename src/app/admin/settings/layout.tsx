import { SettingsShell } from "@/components/admin/SettingsShell";
import { allKitFontClassName } from "@/lib/fonts/all-kits";

/** Brand swatches need every kit face (AURA-398). */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={allKitFontClassName}>
      <SettingsShell>{children}</SettingsShell>
    </div>
  );
}

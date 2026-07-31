import { cormorant } from "@/lib/fonts/cormorant";
import { dmSans } from "@/lib/fonts/dm-sans";
import { newsreader } from "@/lib/fonts/newsreader";
import { syne } from "@/lib/fonts/syne";

/** All kit faces for Brand settings swatches (AURA-398). */
export const allKitFontClassName = [
  newsreader.variable,
  dmSans.variable,
  syne.variable,
  cormorant.variable,
].join(" ");

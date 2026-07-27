/**
 * Default photography agreement clauses for new contract templates.
 * Studios can edit freely — this is a starting point, not legal advice.
 */
export const DEFAULT_CONTRACT_CLAUSES = [
  {
    id: "scope",
    title: "Scope of services",
    text: "Photographer will provide photographic services for the event or session described in the accompanying quote or booking details, including preparation, coverage, and delivery of images as agreed.",
  },
  {
    id: "payment",
    title: "Payment",
    text: "Fees, deposits, and payment schedule are as stated in the quote or invoice. Work may be paused if payment is overdue. Deposits are non-refundable except where required by law or as stated in the cancel policy.",
  },
  {
    id: "cancel",
    title: "Cancellation",
    text: "Client may cancel according to the cancel policy attached to this agreement. Photographer may cancel for illness, emergency, or circumstances beyond reasonable control and will refund unearned fees or help arrange a substitute when possible.",
  },
  {
    id: "delivery",
    title: "Image delivery",
    text: "Images will be delivered via an online gallery or other method agreed in writing. Delivery timelines are estimates. Raw files are not included unless expressly agreed in writing.",
  },
  {
    id: "editing",
    title: "Editing and creative control",
    text: "Photographer retains creative control over posing, composition, and editing style. Delivered images are final. Client may not edit, filter, crop for commercial use, or alter delivered images in a way that misrepresents the Photographer’s work without written permission.",
  },
  {
    id: "usage-client",
    title: "Client personal use",
    text: "Upon full payment, Client receives a personal-use license to share and print images for non-commercial purposes. Resale, sublicensing, or use in advertising requires a separate written license.",
  },
  {
    id: "portfolio",
    title: "Portfolio and marketing",
    text: "Photographer may use images from this engagement in portfolios, websites, social media, print, competitions, and studio marketing, unless Client requests in writing before the session that images remain private.",
  },
  {
    id: "copyright",
    title: "Copyright",
    text: "Photographer retains copyright in all images. This agreement does not transfer copyright to Client. Client may not claim authorship of the photographs.",
  },
  {
    id: "model-release",
    title: "Likeness",
    text: "Client grants Photographer permission to use likenesses of Client and guests reasonably captured at the session for the portfolio and marketing uses above, except where a written privacy request was made before the session.",
  },
  {
    id: "liability",
    title: "Limitation of liability",
    text: "Photographer’s total liability under this agreement is limited to fees paid for the engagement. Photographer is not liable for indirect or consequential damages, including emotional distress, lost opportunities, or third-party costs.",
  },
  {
    id: "force-majeure",
    title: "Force majeure",
    text: "Neither party is liable for delay or failure caused by events beyond reasonable control, including weather, illness, equipment failure, venue restrictions, or acts of government.",
  },
] as const;

export function defaultContractBody(): string {
  return DEFAULT_CONTRACT_CLAUSES.map(
    (c) => `${c.title}\n\n${c.text}`,
  ).join("\n\n");
}

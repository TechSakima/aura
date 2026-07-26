"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { Proposal } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Times-Roman", color: "#1c1915" },
  brand: { fontSize: 28, marginBottom: 8 },
  title: { fontSize: 16, marginBottom: 24, color: "#6b645a" },
  h2: { fontSize: 14, marginTop: 18, marginBottom: 8 },
  p: { marginBottom: 6, lineHeight: 1.4 },
  tier: { marginBottom: 8 },
});

export function ProposalPdfDocument({
  studioName,
  proposal,
}: {
  studioName: string;
  proposal: Proposal;
}) {
  const selected = proposal.tiers.find((t) => t.id === proposal.selectedTierId);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>{studioName}</Text>
        <Text style={styles.title}>{proposal.title}</Text>

        {selected ? (
          <>
            <Text style={styles.h2}>Selected package</Text>
            <Text style={styles.p}>
              {selected.name} — ${selected.price.toLocaleString()}
            </Text>
            <Text style={styles.p}>{selected.description}</Text>
          </>
        ) : (
          <>
            <Text style={styles.h2}>Packages</Text>
            {proposal.tiers.map((t) => (
              <View key={t.id} style={styles.tier}>
                <Text>
                  {t.name} — ${t.price.toLocaleString()}
                </Text>
                <Text style={styles.p}>{t.description}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.h2}>Included</Text>
        {proposal.inclusions.map((item) => (
          <Text key={item} style={styles.p}>
            • {item}
          </Text>
        ))}

        <Text style={styles.h2}>Terms</Text>
        <Text style={styles.p}>{proposal.terms}</Text>

        {Object.keys(proposal.intakeAnswers || {}).length > 0 ? (
          <>
            <Text style={styles.h2}>Intake answers</Text>
            {proposal.intakeSchema.map((q) => {
              const answer = proposal.intakeAnswers?.[q.id];
              if (!answer) return null;
              return (
                <Text key={q.id} style={styles.p}>
                  {q.label}: {answer}
                </Text>
              );
            })}
          </>
        ) : null}
      </Page>
    </Document>
  );
}

export async function downloadProposalPdf(
  studioName: string,
  proposal: Proposal,
) {
  const blob = await pdf(
    <ProposalPdfDocument studioName={studioName} proposal={proposal} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${proposal.title.replace(/\s+/g, "-")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

import { projectHasDepositPaid } from "@/lib/payments/project-balance";
import type {
  AuraDatabase,
  Contract,
  Project,
  Proposal,
} from "@/lib/types";

export type FirstProjectGuideItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  done: boolean;
};

export type FirstProjectGuide = {
  items: FirstProjectGuideItem[];
  done: number;
  total: number;
  complete: boolean;
  projectId?: string;
  projectName?: string;
};

function earliestProject(projects: Project[]): Project | undefined {
  const active = projects.filter(
    (p) => p.stage !== "archived" && p.stage !== "canceled",
  );
  const pool = active.length > 0 ? active : projects;
  return [...pool].sort((a, b) =>
    String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
  )[0];
}

/**
 * First booking spine after signup (AURA-260):
 * create project → send quote → contract → deposit.
 * Hidden when deposit is collected on the earliest project.
 */
export function buildFirstProjectGuide(input: {
  projects: Project[];
  proposals: Proposal[];
  contracts: Contract[];
  invoices: AuraDatabase["invoices"];
  stripeOnboardingComplete: boolean;
}): FirstProjectGuide {
  const project = earliestProject(input.projects);
  const projectId = project?.id;
  const projectHref = projectId
    ? `/admin/projects/${projectId}#workflow`
    : "/admin/projects?new=1";

  const createDone = Boolean(project);

  const projectProposals = projectId
    ? input.proposals.filter((p) => p.projectId === projectId)
    : [];
  const quoteSent = projectProposals.some(
    (p) => p.status === "sent" || p.status === "accepted",
  );

  const projectContracts = projectId
    ? input.contracts.filter((c) => c.projectId === projectId)
    : [];
  const contractSigned = projectContracts.some((c) => c.status === "completed");
  const contractSent = projectContracts.some(
    (c) => c.status === "awaiting_signature" || c.status === "completed",
  );

  const depositDone = projectId
    ? projectHasDepositPaid(
        { invoices: input.invoices, proposals: input.proposals },
        projectId,
      )
    : false;

  const paymentsReady = input.stripeOnboardingComplete;

  const items: FirstProjectGuideItem[] = [
    {
      id: "project",
      label: "Create project",
      detail: createDone
        ? project?.name || "Project ready"
        : "Add the client job",
      href: createDone && projectId
        ? `/admin/projects/${projectId}`
        : "/admin/projects?new=1",
      done: createDone,
    },
    {
      id: "quote",
      label: "Send quote",
      detail: quoteSent
        ? "Quote with client"
        : createDone
          ? "Share a package quote"
          : "Create a project first",
      href: projectHref,
      done: quoteSent,
    },
    {
      id: "contract",
      label: "Contract",
      detail: contractSigned
        ? "Signed"
        : contractSent
          ? "Sent"
          : createDone
            ? "Send for signature"
            : "Create a project first",
      href: projectHref,
      done: contractSent,
    },
    {
      id: "deposit",
      label: "Deposit",
      detail: depositDone
        ? "Received"
        : !paymentsReady
          ? "Enable payments, then collect"
          : createDone
            ? "Collect deposit"
            : "Create a project first",
      href:
        !paymentsReady && !depositDone
          ? "/admin/settings/payments"
          : projectHref,
      done: depositDone,
    },
  ];

  const done = items.filter((i) => i.done).length;
  return {
    items,
    done,
    total: items.length,
    complete: depositDone,
    projectId,
    projectName: project?.name,
  };
}

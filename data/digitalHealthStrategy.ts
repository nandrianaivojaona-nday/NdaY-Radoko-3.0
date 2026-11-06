export type PolicyAlignmentStatus =
  | 'To assess'
  | 'In design'
  | 'Evidence documented'
  | 'Requires Ministry confirmation'

export interface DigitalPolicyRequirement {
  id: string;
  theme: string;
  strategyReference: string;
  requirement: string;
  appImplication: string;
  status: PolicyAlignmentStatus;
}

export const MADAGASCAR_DIGITAL_HEALTH_STRATEGY = {
  title: 'Stratégie Nationale de Santé Digitale de Madagascar',
  period: '2023–2027',
  issuingOrganisation: 'Ministère de la Santé Publique',
  publicationDate: 'January 2023',
  sourceType: 'National strategy — policy alignment, not clinical authority',
  requirements: [
    {
      id: 'DHS-GOV-01',
      theme: 'Governance and standards',
      strategyReference: 'Axes 1.1; pp. 17–18, 23–27',
      requirement:
        'Digital health activities should fit applicable legal, governance, standards, and coordination arrangements.',
      appImplication:
        'Identify the responsible Ministry unit, applicable legal basis, and required standards before deployment.',
      status: 'Requires Ministry confirmation',
    },
    {
      id: 'DHS-ARCH-01',
      theme: 'Architecture and interoperability',
      strategyReference: 'Axes 2.1; pp. 19–20, 24, 26–28',
      requirement:
        'Digital health solutions should align with the national health information architecture and relevant systems.',
      appImplication:
        'Document how the product relates to existing community-health workflows, CommCare, and DHIS2; do not assume a new parallel system.',
      status: 'To assess',
    },
    {
      id: 'DHS-PRIV-01',
      theme: 'Personal health data',
      strategyReference: 'Section 2.1.6; p. 21',
      requirement:
        'Account for the national personal-data protection framework, including medical data.',
      appImplication:
        'Record the data controller, purpose, access rules, retention, security, and required approvals before real patient data is used.',
      status: 'To assess',
    },
    {
      id: 'DHS-OFFLINE-01',
      theme: 'Infrastructure and access',
      strategyReference: 'Sections 1.2.2 and 2.1.5; pp. 15–16, 20',
      requirement:
        'Design for constrained connectivity and infrastructure outside major urban areas.',
      appImplication:
        'Specify offline behavior, local data protection, sync status, and conflict handling.',
      status: 'In design',
    },
  ],
} satisfies {
  title: string;
  period: string;
  issuingOrganisation: string;
  publicationDate: string;
  sourceType: string;
  requirements: DigitalPolicyRequirement[];
};
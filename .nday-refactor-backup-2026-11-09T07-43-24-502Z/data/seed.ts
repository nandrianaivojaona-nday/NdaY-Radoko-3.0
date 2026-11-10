import {
  AiDraft,
  AppData,
  Country,
  Drone,
  DroneStatus,
  Encounter,
  Facility,
  Mother,
  Observation,
  ObservationQuality,
  Patient,
  UserAccount,
  AdministrativeArea,
} from '../types';
import {
  createEmptyMaternalObservations,
  createEmptyObservations,
  deriveSource,
  fingerprintObservations,
} from './observations';
import { MADAGASCAR_YOUNG_INFANT_SOURCES, WHO_UNICEF_YOUNG_INFANT_SOURCES } from './protocoleSources';
import administrativeCsv from '../docs/madagascar_administrative_structure_1695_communes.csv?raw';
import { WHO_YOUNG_INFANT_CLASSIFICATION_RULES } from './whoYoungInfantClassificationRules';

const daysAgo = (days: number, hours = 0): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000).toISOString();
const inDays = (days: number): string =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const parseAdministrativeCsv = (csv: string): AdministrativeArea[] => {
  const rows = csv.trim().split(/\r?\n/).slice(1).map((line) => {
    const [communeId, faritany, region, district, commune, type] = line.split(',').map((part) => part.trim());
    return { communeId, faritany, region, district, commune, type: type as 'URBAN' | 'RURAL' };
  });
  const areas = new Map<string, AdministrativeArea>();
  for (const row of rows) {
    const faritanyId = `FAR-${row.faritany}`;
    const regionId = `REG-${row.faritany}-${row.region}`;
    const districtId = `DIST-${row.faritany}-${row.region}-${row.district}`;
    areas.set(faritanyId, { id: faritanyId, name: row.faritany, level: 'Faritany', parentId: null, sourceStatus: 'Verified reference' });
    areas.set(regionId, { id: regionId, name: row.region, level: 'Faritra', parentId: faritanyId, sourceStatus: 'Verified reference' });
    areas.set(districtId, { id: districtId, name: row.district, level: 'Distrika', parentId: regionId, sourceStatus: 'Verified reference' });
    areas.set(row.communeId, { id: row.communeId, name: row.commune, level: 'Kaominina', parentId: districtId, sourceStatus: 'Verified reference', type: row.type });
  }
  return [...areas.values()];
};

export const ADMINISTRATIVE_AREAS: AdministrativeArea[] = parseAdministrativeCsv(administrativeCsv);

const buildObservations = (
  values: Record<string, { value: string; quality: ObservationQuality; notes?: string }>,
  recordedBy: string,
  recordedAt: string,
): Observation[] =>
  createEmptyObservations().map((observation) => {
    const entry = values[observation.definitionId];
    if (!entry) return observation;
    return {
      ...observation,
      value: entry.value,
      quality: entry.quality,
      source: deriveSource(entry.quality),
      recordedAt,
      recordedBy,
      notes: entry.notes,
    };
  });

const DEMO_FACILITIES: Facility[] = [
  {
    id: 'FAC-COMMUNITY-IFANADIANA-DEMO',
    name: 'Community health site — Ifanadiana (fokontany-specific site to verify)',
    level: 'Community health site',
    district: 'Ifanadiana',
    region: 'Vatovavy',
    faritany: 'Fianarantsoa',
    countryId: 'madagascar',
    contactNote: 'Community health sites are associated with fokontany, but the exact site and catchment are not selected.',
  },
  {
    id: 'FAC-CSB2-IFANADIANA-DEMO',
    name: 'CSB II — Ifanadiana (demonstration record)',
    level: 'CSB II',
    commune: 'Demo Commune — Ifanadiana District',
    district: 'Ifanadiana',
    region: 'Vatovavy',
    faritany: 'Fianarantsoa',
    countryId: 'madagascar',
    referralFacilityId: 'FAC-CHRD-IFANADIANA-DEMO',
    contactNote: 'Facility type and locality are based on public references; named-facility operation and participation are unverified. Demonstration record only.',
  },
  {
    id: 'FAC-CHRD-IFANADIANA-DEMO',
    name: 'CHRD Ifanadiana (demonstration record)',
    level: 'CHD/CHRD',
    commune: 'Ifanadiana (district capital commune)',
    district: 'Ifanadiana',
    region: 'Vatovavy',
    faritany: 'Fianarantsoa',
    countryId: 'madagascar',
    referralFacilityId: 'FAC-CHR-FIANARANTSOA-DEMO',
    contactNote: 'CHRD Ifanadiana is documented in the national list; referral agreement and current receiving hospital are unverified. Demonstration record only.',
  },
  {
    id: 'FAC-CHR-FIANARANTSOA-DEMO',
    name: 'Regional referral hospital — Fianarantsoa (name to verify)',
    level: 'CHR/CHRR',
    commune: 'Fianarantsoa',
    district: 'Fianarantsoa I',
    region: 'Haute Matsiatra',
    faritany: 'Fianarantsoa',
    countryId: 'madagascar',
    contactNote: 'Ifanadiana referral literature describes a regional hospital in Fianarantsoa; exact current institution/name and referral arrangement must be verified.',
  },
  {
    id: 'FAC-CHU-FIANARANTSOA-DEMO',
    name: 'CHU Tambohobe Fianarantsoa (demonstration tertiary option)',
    level: 'CHU',
    commune: 'Fianarantsoa',
    district: 'Fianarantsoa I',
    region: 'Haute Matsiatra',
    faritany: 'Fianarantsoa',
    countryId: 'madagascar',
    contactNote: 'CHU Tambohobe is listed by the Ministry of Health; no direct Ifanadiana referral route or agreement is established.',
  },
  {
    id: 'FAC-OUTREACH',
    name: "NdaY'Radoko demo outreach team",
    level: 'Community outreach team',
    district: 'Ifanadiana',
    region: 'Vatovavy',
    faritany: 'Fianarantsoa',
    countryId: 'madagascar',
    contactNote: 'Synthetic demonstration account; no field team or pilot locality is confirmed.',
  },
];

export const FACILITIES: Facility[] = [
  ...DEMO_FACILITIES,
  ...ADMINISTRATIVE_AREAS.filter((area) => ['Distrika', 'Faritra', 'Faritany'].includes(area.level)).map((area): Facility => {
    const level = area.level === 'Distrika' ? 'CHD/CHRD' : area.level === 'Faritra' ? 'CHR/CHRR' : 'CHU';
    const parent = ADMINISTRATIVE_AREAS.find((item) => item.id === area.parentId);
    const upper = parent?.parentId ? ADMINISTRATIVE_AREAS.find((item) => item.id === parent.parentId) : undefined;
    return {
      id: `FAC-${level}-${area.id}`,
      name: `${level} directory placeholder — ${area.name}`,
      level,
      district: area.level === 'Distrika' ? area.name : parent?.name ?? '',
      region: area.level === 'Faritra' ? area.name : area.level === 'Distrika' ? parent?.name : upper?.name,
      faritany: area.level === 'Faritany' ? area.name : area.level === 'Faritra' ? parent?.name : upper?.name,
      countryId: 'madagascar',
      contactNote: `Administrative directory placeholder for ${area.level}; actual named health facility and referral pathway require verification.`,
    };
  }),
  ...ADMINISTRATIVE_AREAS.filter((area) => area.level === 'Kaominina').map((area): Facility => {
    const district = ADMINISTRATIVE_AREAS.find((parent) => parent.id === area.parentId);
    const region = ADMINISTRATIVE_AREAS.find((parent) => parent.id === district?.parentId);
    const faritany = ADMINISTRATIVE_AREAS.find((parent) => parent.id === region?.parentId);
    return {
      id: `FAC-CSB-${area.id}`,
      name: `CSB directory placeholder — ${area.name}`,
      level: 'CSB II',
      commune: area.name,
      communeAreaId: area.id,
      district: district?.name ?? '',
      region: region?.name,
      faritany: faritany?.name,
      countryId: 'madagascar',
      referralFacilityId: `FAC-CHD/CHRD-${district?.id}`,
      contactNote: `Administrative directory only (${area.type ?? 'type unspecified'}). Named CSB, operating status and catchment not verified.`,
    };
  }),
];

export const USERS: UserAccount[] = [
  {
    id: 'U-DR-VOA',
    name: 'Dr. Voahangy Rakoto',
    role: 'Physician',
    facilityId: 'FAC-CHR-FIANARANTSOA-DEMO',
    title: 'Paediatrician — clinical lead (demo role)',
    demoCredential: 'demo-physician-1',
    professionalRegistration: 'DEMO-REG-0001',
    isDemo: true,
  },
  {
    id: 'U-DR-HERY',
    name: 'Dr. Hery Randriamahazo',
    role: 'Physician',
    facilityId: 'FAC-OUTREACH',
    title: 'Medical officer, Ifanadiana CSB II (demo role)',
    demoCredential: 'demo-physician-2',
    professionalRegistration: 'DEMO-REG-0002',
    isDemo: true,
  },
  {
    id: 'U-FO-LOVA',
    name: 'Lova Randrianasolo',
    role: 'Field Officer',
    facilityId: 'FAC-CSB2-IFANADIANA-DEMO',
    title: 'Field operations lead (demo role)',
    demoCredential: 'demo-field-1',
    isDemo: true,
  },
  {
    id: 'U-FO-MIALY',
    name: 'Mialy Andrianina',
    role: 'Field Officer',
    facilityId: 'FAC-OUTREACH',
    title: 'Community assessment assistant (demo role)',
    demoCredential: 'demo-field-2',
    isDemo: true,
  },
  {
    id: 'U-PA-ZAFY',
    name: 'Zafy Rabe',
    role: 'Program Admin',
    facilityId: null,
    title: "Programme lead, NdaY' Enterprise (demo role)",
    demoCredential: 'demo-program-1',
    isDemo: true,
  },
];

// ---------------------------------------------------------------------------
// Mothers — separate records, linked to one infant each in this seed
// ---------------------------------------------------------------------------

export const MOTHERS: Mother[] = [
  {
    id: 'MO-001',
    name: 'Fara (synthetic)',
    ageYears: 24,
    village: 'Demo Community',
    district: 'Demo District',
    countryId: 'madagascar',
    observations: createEmptyMaternalObservations(),
    reportedNeeds: ['breastfeeding support'],
    createdAt: daysAgo(1, 4),
    createdBy: 'U-FO-LOVA',
    dataClassification: 'Demo — synthetic',
    isPrimaryCaregiver: true,
  },
  {
    id: 'MO-002',
    name: 'Noro (synthetic)',
    ageYears: 31,
    village: 'Demo District',
    district: 'Demo District',
    countryId: 'madagascar',
    observations: createEmptyMaternalObservations(),
    reportedNeeds: ['food insecurity'],
    createdAt: daysAgo(2),
    createdBy: 'U-FO-MIALY',
    dataClassification: 'Demo — synthetic',
    isPrimaryCaregiver: true,
  },
  {
    id: 'MO-003',
    name: 'Voahirana (synthetic)',
    ageYears: 19,
    village: 'Demo Community',
    district: 'Demo District',
    countryId: 'madagascar',
    observations: createEmptyMaternalObservations(),
    reportedNeeds: [],
    createdAt: daysAgo(1),
    createdBy: 'U-FO-LOVA',
    dataClassification: 'Demo — synthetic',
    isPrimaryCaregiver: true,
  },
  {
    id: 'MO-004',
    name: 'Tiana (synthetic)',
    ageYears: 27,
    village: 'Demo Community',
    district: 'Demo District',
    countryId: 'madagascar',
    observations: createEmptyMaternalObservations(),
    reportedNeeds: ['breastfeeding support', 'low mood (informal report)'],
    createdAt: daysAgo(4),
    createdBy: 'U-FO-MIALY',
    dataClassification: 'Demo — synthetic',
    isPrimaryCaregiver: true,
  },
  {
    id: 'MO-005',
    name: 'Soa (synthetic)',
    ageYears: 52,
    village: 'Ambodimanga',
    district: 'Demo District',
    countryId: 'madagascar',
    observations: createEmptyMaternalObservations(),
    reportedNeeds: [],
    createdAt: daysAgo(0, 3),
    createdBy: 'U-FO-LOVA',
    dataClassification: 'Demo — synthetic',
    // The grandmother is the primary caregiver for this infant; the mother record
    // is kept so maternal observations can still be captured if she is present.
    isPrimaryCaregiver: false,
  },
];

const whoUnicefYoungInfantReference = {
  id: 'PROTO-WHO-UNICEF-SYI-2019',
  countryId: 'madagascar',
  ageProtocol: 'Young Infant' as const,
  scope: 'International reference — not nationally adopted' as const,
  title: 'WHO/UNICEF international reference — sick young infant aged 0–59 days',
  version: 'WHO/UNICEF young-infant IMCI chart 2019; WHO serious bacterial infection guideline 2024; WHO IYCF model chapter 2025',
  sourceTitle: 'Management of the sick young infant aged up to 2 months: IMCI chart booklet',
  sourceOrganisation: 'World Health Organization and UNICEF',
  sourceDate: '2019-07-22',
  sourceUrl: 'https://www.who.int/publications/i/item/9789241516365',
  sources: WHO_UNICEF_YOUNG_INFANT_SOURCES,
  contextualizations: [],
  classificationRules: WHO_YOUNG_INFANT_CLASSIFICATION_RULES,
  clinicalApproval: 'Draft — not reviewed' as const,
  notes: 'International source-mapped chart classes are loaded for a synthetic demonstrator only. The 2019 chart supersedes the 2014 chart; WHO 2024 SBI guidance is supplementary and differs on fever threshold and fast-breathing age scope. The 2025 IYCF model chapter supports feeding counselling only. No source establishes Madagascar adoption. Display swatches approximate chart colour families; rules and actions require qualified clinical reconciliation, local protocol review and approval before any care use.',
  importedAt: daysAgo(1),
  importedBy: 'NdaY’Radoko reference register',
};

const madagascarYoungInfantProtocol = {
  id: 'PROTO-MG-YI-0.1',
  countryId: 'madagascar',
  ageProtocol: 'Young Infant' as const,
  scope: 'Madagascar national draft' as const,
  title: 'Madagascar PCIMNE young-infant draft — secondary / edition unverified',
  version: 'Madagascar workshop edition — not yet identified',
  sourceTitle: 'Madagascar PCIMNE young-infant chart — workshop version pending',
  sourceOrganisation: 'Madagascar Ministry of Public Health',
  sourceDate: 'Not documented',
  sourceUrl: undefined,
  sources: MADAGASCAR_YOUNG_INFANT_SOURCES,
  validationEvent: {
    status: 'Reported — record pending' as const,
    leadOrganisation: 'Madagascar Ministry of Public Health',
    funder: 'ACCESS (USAID-funded programme)',
    venue: 'Au Lion d’Or, Anosy Avaratra',
    date: null,
    evidenceDescription:
      'Workshop validation is confirmed by the project owner. The workshop report and approved chart copy have not yet been attached to the application record.',
  },
  clinicalApproval: 'Draft — not reviewed' as const,
  notes:
    'The workshop validation event is recorded separately from approval of this software content. The exact Madagascar chart edition, rule text, and page references still need to be matched to the workshop-approved document before this protocol can be treated as approved for software use.',
  importedAt: daysAgo(30),
  importedBy: 'Zafy Rabe',
};

const madagascarChildProtocol = {
  id: 'PROTO-MG-CH-0.1',
  countryId: 'madagascar',
  ageProtocol: 'Child' as const,
  title: 'Child (2–59 months) assessment support — proposed local adaptation',
  version: '1.0-pcimne-draft',
  sourceTitle: 'WHO IMCI chart booklet — sick child 2 months up to 5 years',
  sourceOrganisation: 'OMS / Ministère de la Santé (PCIMNE 2017, FR) + Madagascar — politique nationale de nutrition',
  sourceUrl: 'https://www.who.int/publications/i/item/9789241516365',
  sourceDate: '2017 / 2021',
  importedAt: daysAgo(30),
  importedBy: 'Zafy Rabe',
  clinicalApproval: 'Draft — not reviewed' as const,
  reviewDueAt: inDays(30),
  notes: 'Out of scope for the first FemTech pilot, which focuses on young infants 0–59 days.',
};

export const COUNTRIES: Country[] = [
  {
    id: 'madagascar',
    name: 'Madagascar',
    localLanguage: 'fr',
    isImplemented: true,
    role: 'National design context',
    protocols: [whoUnicefYoungInfantReference, madagascarYoungInfantProtocol, madagascarChildProtocol],
    protocolText: {
      'Young Infant': 'Prototype default: WHO/UNICEF 2019 young-infant IMCI chart booklet (0–59 days), supplemented by WHO 2024 serious bacterial infection recommendations and WHO 2025 infant and young child feeding guidance. Source-mapped classes are draft demonstration content, not approved Madagascar policy or for patient care; reconcile the 2019/2024 infection criteria and obtain clinical review before use.',
      Child: 'Default Madagascar child protocol — not used in the young-infant pilot.',
    },
  },
  {
    id: 'senegal',
    name: 'Senegal',
    localLanguage: 'fr',
    isImplemented: false,
    role: 'Exploration only',
    protocols: [],
    protocolText: {
      'Young Infant': 'Exploration context only — no approved protocol has been imported.',
      Child: 'Exploration context only — no approved protocol has been imported.',
    },
  },
  {
    id: 'kenya',
    name: 'Kenya',
    localLanguage: 'en',
    isImplemented: false,
    role: 'Exploration only',
    protocols: [],
    protocolText: {
      'Young Infant': 'Exploration context only — no approved protocol has been imported.',
      Child: 'Exploration context only — no approved protocol has been imported.',
    },
  },
  {
    id: 'ghana',
    name: 'Ghana',
    localLanguage: 'en',
    isImplemented: false,
    role: 'Exploration only',
    protocols: [],
    protocolText: {
      'Young Infant': 'Exploration context only — no approved protocol has been imported.',
      Child: 'Exploration context only — no approved protocol has been imported.',
    },
  },
  {
    id: 'nigeria',
    name: 'Nigeria',
    localLanguage: 'en',
    isImplemented: false,
    role: 'Exploration only',
    protocols: [],
    protocolText: {
      'Young Infant': 'Exploration context only — no approved protocol has been imported.',
      Child: 'Exploration context only — no approved protocol has been imported.',
    },
  },
  {
    id: 'ivory-coast',
    name: 'Côte d’Ivoire',
    localLanguage: 'fr',
    isImplemented: false,
    role: 'Exploration only',
    protocols: [],
    protocolText: {
      'Young Infant': 'Exploration context only — no approved protocol has been imported.',
      Child: 'Exploration context only — no approved protocol has been imported.',
    },
  },
];

// ---------------------------------------------------------------------------
// Patients — each patient links to a mother via `motherId`
// ---------------------------------------------------------------------------

export const PATIENTS: Patient[] = [
  {
    id: 'PT-001',
    motherId: 'MO-001',
    name: 'Baby Aisha (synthetic)',
    ageDays: 21,
    ageLabel: '21 days',
    sex: 'Female',
    caregiverName: 'Fara',
    caregiverRelationship: 'Mother',
    village: 'Demo Community',
    district: 'Demo District',
    countryId: 'madagascar',
    reportedConcerns: ['fever', 'cough', 'fast breathing'],
    createdAt: daysAgo(1, 4),
    createdBy: 'U-FO-LOVA',
    dataClassification: 'Demo — synthetic',
  },
  {
    id: 'PT-002',
    motherId: 'MO-002',
    name: 'Infant Ben (synthetic)',
    ageDays: 45,
    ageLabel: '45 days',
    sex: 'Male',
    caregiverName: 'Noro',
    caregiverRelationship: 'Mother',
    village: 'Demo District',
    district: 'Demo District',
    countryId: 'madagascar',
    reportedConcerns: ['diarrhoea', 'poor feeding'],
    createdAt: daysAgo(2),
    createdBy: 'U-FO-MIALY',
    dataClassification: 'Demo — synthetic',
  },
  {
    id: 'PT-003',
    motherId: 'MO-003',
    name: 'Baby Chloe (synthetic)',
    ageDays: 12,
    ageLabel: '12 days',
    sex: 'Female',
    caregiverName: 'Voahirana',
    caregiverRelationship: 'Mother',
    village: 'Demo Community',
    district: 'Demo District',
    countryId: 'madagascar',
    reportedConcerns: ['poor feeding', 'convulsions'],
    createdAt: daysAgo(1),
    createdBy: 'U-FO-LOVA',
    dataClassification: 'Demo — synthetic',
  },
  {
    id: 'PT-004',
    motherId: 'MO-004',
    name: 'Baby Fara (synthetic)',
    ageDays: 28,
    ageLabel: '28 days',
    sex: 'Female',
    caregiverName: 'Tiana',
    caregiverRelationship: 'Mother',
    village: 'Demo Community',
    district: 'Demo District',
    countryId: 'madagascar',
    reportedConcerns: ['feeding concern'],
    createdAt: daysAgo(4),
    createdBy: 'U-FO-MIALY',
    dataClassification: 'Demo — synthetic',
  },
  {
    id: 'PT-005',
    motherId: 'MO-005',
    name: 'Baby Koto (synthetic)',
    ageDays: 8,
    ageLabel: '8 days',
    sex: 'Male',
    caregiverName: 'Soa',
    caregiverRelationship: 'Grandmother',
    village: 'Ambodimanga',
    district: 'Demo District',
    countryId: 'madagascar',
    reportedConcerns: ['umbilicus redness'],
    createdAt: daysAgo(0, 3),
    createdBy: 'U-FO-LOVA',
    dataClassification: 'Demo — synthetic',
  },
];

const aishaObservations = buildObservations(
  {
    convulsions: { value: 'No', quality: 'Reported — unverified' },
    feeding_poorly: { value: 'Yes — less than usual', quality: 'Reported — unverified' },
    vomits_everything: { value: 'No', quality: 'Reported — unverified' },
    lethargy: { value: 'Alert and active', quality: 'Observed — remote' },
    respiratory_rate: { value: '62', quality: 'Measured — device', notes: 'Counted twice by trained assistant.' },
    chest_indrawing: { value: 'Absent', quality: 'Observed — remote' },
    grunting: { value: 'Absent', quality: 'Observed — remote' },
    axillary_temperature: { value: '38.1', quality: 'Measured — device' },
    breastfeeding_status: { value: 'Exclusively breastfeeding', quality: 'Reported — unverified' },
    feeding_change: { value: 'Less than usual', quality: 'Reported — unverified' },
    jaundice_present: { value: 'No', quality: 'Observed — remote' },
    jaundice_onset_day: { value: 'N/A — no jaundice reported', quality: 'Reported — unverified' },
    jaundice_palms_soles: { value: 'No', quality: 'Observed — remote' },
    diarrhoea_present: { value: 'No', quality: 'Reported — unverified' },
    blood_in_stool: { value: 'No', quality: 'Reported — unverified' },
    sunken_eyes: { value: 'No', quality: 'Observed — remote' },
    umbilical_infection: { value: 'No', quality: 'Observed — remote' },
    skin_pustules: { value: 'No', quality: 'Observed — remote' },
    ear_discharge: { value: 'No', quality: 'Observed — remote' },
    immunisation_status: { value: 'Up to date for age', quality: 'Reported — unverified' },
    other_problem: { value: 'Mother reports cough and fast breathing since yesterday.', quality: 'Reported — unverified' },
  },
  'U-FO-LOVA',
  daysAgo(1, 3),
);

const benObservations = buildObservations(
  {
    convulsions: { value: 'No', quality: 'Reported — unverified' },
    feeding_poorly: { value: 'Yes — less than usual', quality: 'Reported — unverified' },
    vomits_everything: { value: 'No', quality: 'Reported — unverified' },
    lethargy: { value: 'Less active than usual', quality: 'Observed — remote' },
    respiratory_rate: { value: '54', quality: 'Measured — device' },
    chest_indrawing: { value: 'Unable to assess', quality: 'Unusable', notes: 'Video connection dropped during the chest view.' },
    axillary_temperature: { value: '37.0', quality: 'Measured — device' },
    breastfeeding_status: { value: 'Mixed feeding', quality: 'Reported — unverified' },
    feeding_change: { value: 'Much less or stopped', quality: 'Reported — unverified' },
    diarrhoea_present: { value: 'Yes', quality: 'Reported — unverified' },
    diarrhoea_duration: { value: '2', quality: 'Reported — unverified' },
    blood_in_stool: { value: 'No', quality: 'Reported — unverified' },
    sunken_eyes: { value: 'Yes', quality: 'Observed — remote' },
  },
  'U-FO-MIALY',
  daysAgo(1, 8),
);

const chloeObservations = buildObservations(
  {
    convulsions: { value: 'Yes — during this illness', quality: 'Reported — unverified' },
    feeding_poorly: { value: 'Yes — not feeding at all', quality: 'Reported — unverified' },
    lethargy: { value: 'Lethargic or unconscious', quality: 'Observed — remote' },
    respiratory_rate: { value: '58', quality: 'Measured — device' },
  },
  'U-FO-LOVA',
  daysAgo(0, 6),
);

const faraObservations = buildObservations(
  {
    convulsions: { value: 'No', quality: 'Reported — unverified' },
    feeding_poorly: { value: 'Yes — less than usual', quality: 'Reported — unverified' },
    vomits_everything: { value: 'No', quality: 'Reported — unverified' },
    lethargy: { value: 'Alert and active', quality: 'Observed — remote' },
    respiratory_rate: { value: '48', quality: 'Measured — device' },
    chest_indrawing: { value: 'Absent', quality: 'Observed — remote' },
    grunting: { value: 'Absent', quality: 'Observed — remote' },
    axillary_temperature: { value: '36.8', quality: 'Measured — device' },
    weight: { value: '3.4', quality: 'Measured — device' },
    breastfeeding_status: { value: 'Exclusively breastfeeding', quality: 'Reported — unverified' },
    feeding_change: { value: 'Less than usual', quality: 'Reported — unverified' },
    jaundice_present: { value: 'No', quality: 'Observed — remote' },
    jaundice_onset_day: { value: 'N/A — no jaundice reported', quality: 'Reported — unverified' },
    jaundice_palms_soles: { value: 'No', quality: 'Observed — remote' },
    diarrhoea_present: { value: 'No', quality: 'Reported — unverified' },
    blood_in_stool: { value: 'No', quality: 'Reported — unverified' },
    sunken_eyes: { value: 'No', quality: 'Observed — remote' },
    umbilical_infection: { value: 'No', quality: 'Observed — remote' },
    skin_pustules: { value: 'No', quality: 'Observed — remote' },
    ear_discharge: { value: 'No', quality: 'Observed — remote' },
  },
  'U-FO-MIALY',
  daysAgo(4),
);

export const buildSeedDraft = (
  observations: Observation[],
  protocolId: string,
  protocolVersion: string,
  text: string,
  generatedAt: string,
): AiDraft => ({
  id: `DRAFT-${protocolId}-${generatedAt}`,
  text,
  generatedAt,
  model: 'Local deterministic template (simulated)',
  protocolId,
  protocolVersion,
  evidenceFingerprint: fingerprintObservations(observations),
  simulated: true,
  limitations:
    'Simulated draft prepared for demonstration. Not a diagnosis and not clinically validated. A qualified physician must review the evidence and sign the decision.',
});

const aishaDraftText = `AI DOCUMENTATION DRAFT — NOT A DIAGNOSIS

1. Reported observations
- Convulsions: No
- Feeding poorly: Yes — less than usual
- Vomits everything: No
- Level of consciousness: Alert and active
- Respiratory rate: 62 breaths/min (measured twice)
- Severe chest indrawing: Absent
- Grunting: Absent
- Axillary temperature: 38.1 °C
- Breastfeeding: Exclusively breastfeeding
- Feeding change: Less than usual
- Jaundice (eyes/skin): No
- Yellow palms or soles: No
- Diarrhoea: No
- Sunken eyes: No
- Umbilicus red or draining pus: No
- Skin pustules: No
- Ear discharge: No
- Immunisation: Up to date for age

2. Danger signs explicitly reported
None of the four core danger-sign questions was answered “yes”. The recorded respiratory rate is elevated for age and requires physician review.

3. Information missing or unclear
- Jaundice onset is not applicable because no jaundice was observed.
- Weight was not measured.
- Skin pinch and fontanelle assessment are in-person-only observations and were not performed.

4. Points for physician review
- Patient: Baby Aisha (synthetic), 21 days; caregiver: Fara (mother).
- Linked mother record: Fara (MO-001); reported needs: breastfeeding support.
- Equipment mode: Drone-assisted outreach (simulated readiness).
- Consent: recorded; image capture allowed.
- Protocol reference: young infant 0–59 days, v0.1-demo, Draft — not reviewed.
- The physician must decide whether the remote evidence is sufficient.

5. Limitations
This draft was produced by a deterministic local template because no AI model is configured. It does not diagnose, classify, score, or recommend treatment.`;

const faraDraftText = `AI DOCUMENTATION DRAFT — NOT A DIAGNOSIS

1. Reported observations
- Feeding less than usual for one day
- No convulsions, no vomiting, alert and active
- Respiratory rate 48 breaths/min; no chest indrawing; no grunting
- Temperature 36.8 °C; weight 3.4 kg
- No jaundice, diarrhoea, skin pustules, umbilical redness, or ear discharge

2. Danger signs explicitly reported
None recorded.

3. Information missing or unclear
- Weight-for-age classification was not determined remotely.
- No in-person examination was performed.

4. Points for physician review
- Patient: Baby Fara (synthetic), 28 days; caregiver: Tiana (mother).
- Linked mother record: Tiana (MO-004); reported needs: breastfeeding support, low mood (informal report).
- The caregiver reports reduced feeding without other danger signs.
- The physician may consider home follow-up with feeding support and a scheduled review.

5. Limitations
Simulated draft. Not a diagnosis. Physician review and signature are required.`;

export const ENCOUNTERS: Encounter[] = [
  {
    id: 'ENC-1001',
    motherId: 'MO-001',
    patientId: 'PT-001',
    countryId: 'madagascar',
    facilityId: 'FAC-OUTREACH',
    createdBy: 'U-FO-LOVA',
    createdAt: daysAgo(1, 4),
    status: 'Awaiting physician review',
    equipmentMode: 'Drone-assisted outreach',
    assignedDroneId: 'DR-001',
    consent: {
      obtained: true,
      obtainedBy: 'U-FO-LOVA',
      obtainedAt: daysAgo(1, 4),
      scope: 'Remote assessment, image capture, physician review, and follow-up contact. Synthetic demo data.',
      imageCaptureAllowed: true,
    },
    observations: aishaObservations,
    aiDraft: buildSeedDraft(
      aishaObservations,
      'PROTO-MG-YI-0.1',
      '0.1-demo',
      aishaDraftText,
      daysAgo(1, 3),
    ),
    physicianDecision: null,
    followUp: null,
    referral: null,
    safetyEscalation: { triggered: false, reason: '', triggeredAt: null, triggeredBy: null },
    deliveryState: 'Under review',
    draftReview: null,
    logistics: { required: true, mode: 'Drone delivery', status: 'Delivered', note: 'Demonstration only — no real flight conducted.', deliveryOutcome: 'Delivered ≠ assessed.' },
    failureEvents: [],
    history: [
      {
        at: daysAgo(1, 3),
        actorId: 'U-FO-LOVA',
        actorName: 'Lova Randrianasolo (Field Officer)',
        action: 'Simulated AI draft prepared',
        detail: 'Local deterministic template; awaiting physician review.',
        evidenceClass: 'simulated',
      },
      {
        at: daysAgo(1, 4),
        actorId: 'U-FO-LOVA',
        actorName: 'Lova Randrianasolo (Field Officer)',
        action: 'Observations recorded',
        detail: 'Required observations assessed; image capture consent recorded.',
        evidenceClass: 'working',
      },
      {
        at: daysAgo(1, 4),
        actorId: 'U-FO-LOVA',
        actorName: 'Lova Randrianasolo (Field Officer)',
        action: 'Encounter created',
        detail: 'Mother MO-001 · Equipment mode: Drone-assisted outreach',
        evidenceClass: 'working',
      },
    ],
    notes: 'Demonstration case with a complete evidence set and a simulated AI draft.',
  },
  {
    id: 'ENC-1002',
    motherId: 'MO-002',
    patientId: 'PT-002',
    countryId: 'madagascar',
    facilityId: 'FAC-CHRD-IFANADIANA-DEMO',
    createdBy: 'U-FO-MIALY',
    createdAt: daysAgo(1, 9),
    status: 'Evidence collected',
    equipmentMode: 'Community teleconsultation',
    assignedDroneId: null,
    consent: {
      obtained: true,
      obtainedBy: 'U-FO-MIALY',
      obtainedAt: daysAgo(1, 9),
      scope: 'Remote assessment, image capture, physician review, and follow-up contact. Synthetic demo data.',
      imageCaptureAllowed: true,
    },
    observations: benObservations,
    aiDraft: null,
    physicianDecision: null,
    followUp: null,
    referral: null,
    safetyEscalation: { triggered: false, reason: '', triggeredAt: null, triggeredBy: null },
    deliveryState: 'Received by facility',
    draftReview: null,
    logistics: { required: false, mode: 'Local resources', status: 'Not required', note: 'Community teleconsultation — no equipment mission.', deliveryOutcome: '' },
    failureEvents: [
      {
        at: daysAgo(1, 8),
        type: 'Connectivity loss',
        detail: 'Video call dropped while attempting the chest-indrawing view; recorded as unusable rather than absent.',
      },
    ],
    history: [
      {
        at: daysAgo(1, 8),
        actorId: 'U-FO-MIALY',
        actorName: 'Mialy Andrianina (Field Officer)',
        action: 'Operational failure logged',
        detail: 'Connectivity loss: video dropped; chest-indrawing recorded as unusable.',
        evidenceClass: 'working',
      },
      {
        at: daysAgo(1, 9),
        actorId: 'U-FO-MIALY',
        actorName: 'Mialy Andrianina (Field Officer)',
        action: 'Encounter created',
        detail: 'Mother MO-002 · Equipment mode: Community teleconsultation (drone not required)',
        evidenceClass: 'working',
      },
    ],
    notes:
      'Demonstrates the non-drone pathway and the difference between “not assessed” and “normal”. Chest indrawing is unusable, not absent.',
  },
  {
    id: 'ENC-1003',
    motherId: 'MO-003',
    patientId: 'PT-003',
    countryId: 'madagascar',
    facilityId: 'FAC-CSB2-IFANADIANA-DEMO',
    createdBy: 'U-FO-LOVA',
    createdAt: daysAgo(0, 7),
    status: 'Referral in progress',
    equipmentMode: 'Community teleconsultation',
    assignedDroneId: null,
    consent: {
      obtained: true,
      obtainedBy: 'U-FO-LOVA',
      obtainedAt: daysAgo(0, 7),
      scope: 'Urgent referral coordination and follow-up contact. Synthetic demo data.',
      imageCaptureAllowed: false,
    },
    observations: chloeObservations,
    aiDraft: null,
    physicianDecision: null,
    followUp: null,
    referral: {
      facility: 'Demo District District Hospital',
      urgency: 'Same day',
      reason: 'Reported convulsions and not feeding at all in a 12-day-old infant. Urgent in-person assessment required.',
      initiatedAt: daysAgo(0, 6),
      initiatedBy: 'U-FO-LOVA',
      completedAt: null,
      outcome: '',
    },
    safetyEscalation: {
      triggered: true,
      reason: 'Danger sign reported: convulsions and stopped feeding.',
      triggeredAt: daysAgo(0, 6),
      triggeredBy: 'U-FO-LOVA',
    },
    deliveryState: 'Received by facility',
    draftReview: null,
    logistics: { required: false, mode: 'Local resources', status: 'Not required', note: 'Urgent referral — no equipment mission.', deliveryOutcome: '' },
    failureEvents: [],
    history: [
      {
        at: daysAgo(0, 6),
        actorId: 'U-FO-LOVA',
        actorName: 'Lova Randrianasolo (Field Officer)',
        action: 'Urgent care escalation — AI and drone bypassed',
        detail: 'Danger sign reported; same-day referral initiated without waiting for AI draft.',
        evidenceClass: 'working',
      },
      {
        at: daysAgo(0, 7),
        actorId: 'U-FO-LOVA',
        actorName: 'Lova Randrianasolo (Field Officer)',
        action: 'Encounter created',
        detail: 'Mother MO-003 · Equipment mode: Community teleconsultation',
        evidenceClass: 'working',
      },
    ],
    notes: 'Critical demonstration: urgent care does not wait for the AI or the drone.',
  },
  {
    id: 'ENC-1004',
    motherId: 'MO-004',
    patientId: 'PT-004',
    countryId: 'madagascar',
    facilityId: 'FAC-CSB2-IFANADIANA-DEMO',
    createdBy: 'U-FO-MIALY',
    createdAt: daysAgo(4, 2),
    status: 'Follow-up scheduled',
    equipmentMode: 'Drone-assisted outreach',
    assignedDroneId: 'DR-001',
    consent: {
      obtained: true,
      obtainedBy: 'U-FO-MIALY',
      obtainedAt: daysAgo(4, 2),
      scope: 'Remote assessment, image capture, physician review, and follow-up contact. Synthetic demo data.',
      imageCaptureAllowed: true,
    },
    observations: faraObservations,
    aiDraft: buildSeedDraft(faraObservations, 'PROTO-MG-YI-0.1', '0.1-demo', faraDraftText, daysAgo(4, 1)),
    physicianDecision: {
      id: 'DEC-1004',
      physicianId: 'U-DR-HERY',
      physicianName: 'Dr. Hery Randriamahazo',
      facilityId: 'FAC-CSB2-IFANADIANA-DEMO',
      facilityName: 'Demo Primary Health Centre CSB II',
      disposition: 'Home follow-up',
      workingAssessment:
        'Reduced feeding without recorded danger signs. No respiratory distress or fever recorded remotely. Weight 3.4 kg at 28 days.',
      instructionsForCaregiver:
        'Continue breastfeeding on demand. Offer the breast more frequently today. Return for in-person assessment if feeding does not improve within 24 hours.',
      safetyNetting:
        'Seek care immediately if the baby stops feeding, has convulsions, vomits everything, becomes very sleepy or difficult to wake, breathes fast, or develops yellow palms or soles.',
      signedAt: daysAgo(4),
      evidenceFingerprint: fingerprintObservations(faraObservations),
      incompleteEvidenceAcknowledged: false,
      amendments: [],
      caregiverUnderstandingConfirmed: true,
      caregiverUnderstandingNotes: 'Caregiver repeated the danger signs in her own words.',
    },
    followUp: {
      dueAt: inDays(1),
      method: 'Community health worker visit',
      completedAt: null,
      outcome: '',
    },
    referral: null,
    safetyEscalation: { triggered: false, reason: '', triggeredAt: null, triggeredBy: null },
    deliveryState: 'Under review',
    draftReview: null,
    logistics: { required: true, mode: 'Drone delivery', status: 'Delivered', note: 'Demonstration only — no real flight conducted.', deliveryOutcome: 'Delivered ≠ assessed.' },
    failureEvents: [],
    history: [
      {
        at: daysAgo(4),
        actorId: 'U-DR-HERY',
        actorName: 'Dr. Hery Randriamahazo (Physician)',
        action: 'Physician decision signed',
        detail: 'Home follow-up',
        evidenceClass: 'working',
      },
      {
        at: daysAgo(4, 1),
        actorId: 'U-FO-MIALY',
        actorName: 'Mialy Andrianina (Field Officer)',
        action: 'Simulated AI draft prepared',
        detail: 'Local deterministic template; physician reviewed and signed.',
        evidenceClass: 'simulated',
      },
      {
        at: daysAgo(4, 2),
        actorId: 'U-FO-MIALY',
        actorName: 'Mialy Andrianina (Field Officer)',
        action: 'Encounter created',
        detail: 'Mother MO-004 · Equipment mode: Drone-assisted outreach',
        evidenceClass: 'working',
      },
    ],
    notes: 'Demonstrates a signed decision, caregiver instructions, safety netting, and scheduled follow-up.',
  },
  {
    id: 'ENC-1005',
    motherId: 'MO-005',
    patientId: 'PT-005',
    countryId: 'madagascar',
    facilityId: 'FAC-CSB2-IFANADIANA-DEMO',
    createdBy: 'U-FO-LOVA',
    createdAt: daysAgo(0, 2),
    status: 'Assessment initiated',
    equipmentMode: 'Drone-assisted outreach',
    assignedDroneId: null,
    consent: {
      obtained: false,
      obtainedBy: null,
      obtainedAt: null,
      scope: '',
      imageCaptureAllowed: false,
    },
    observations: createEmptyObservations(),
    aiDraft: null,
    physicianDecision: null,
    followUp: null,
    referral: null,
    safetyEscalation: { triggered: false, reason: '', triggeredAt: null, triggeredBy: null },
    deliveryState: 'Saved locally',
    draftReview: null,
    logistics: { required: false, mode: 'None', status: 'Not required', note: 'Consent not yet recorded.', deliveryOutcome: '' },
    failureEvents: [],
    history: [
      {
        at: daysAgo(0, 2),
        actorId: 'U-FO-LOVA',
        actorName: 'Lova Randrianasolo (Field Officer)',
        action: 'Encounter created',
        detail: 'Mother MO-005 · Consent not yet recorded. Assessment cannot proceed without consent.',
        evidenceClass: 'working',
      },
    ],
    notes: 'Consent is incomplete; the UI should prevent assessment from proceeding silently.',
  },
];

const readiness = (simulated = true) => [
  {
    id: 'airframe',
    label: 'Airframe and propeller inspection',
    status: simulated ? ('Simulated pass' as const) : ('Not tested' as const),
    evidence: simulated ? 'Bench inspection recorded in demo; no independent airworthiness review.' : 'Not performed.',
    checkedAt: simulated ? daysAgo(2) : null,
    checkedBy: simulated ? 'U-FO-LOVA' : null,
    evidenceClass: simulated ? ('simulated' as const) : ('planned' as const),
  },
  {
    id: 'link',
    label: 'Command and video link',
    status: 'Not tested' as const,
    evidence: 'No field link-budget measurement. Connectivity failure procedure exists in the product.',
    checkedAt: null,
    checkedBy: null,
    evidenceClass: 'planned' as const,
  },
  {
    id: 'endurance',
    label: 'Battery endurance and return-to-home',
    status: 'Not tested' as const,
    evidence: 'No measured flight endurance. Return-to-home behaviour is not verified.',
    checkedAt: null,
    checkedBy: null,
    evidenceClass: 'planned' as const,
  },
  {
    id: 'flightlog',
    label: 'Traceable flight log and incident reporting',
    status: 'Not tested' as const,
    evidence: 'No flight log exists. Incident reporting process is drafted, not operated.',
    checkedAt: null,
    checkedBy: null,
    evidenceClass: 'planned' as const,
  },
];

export const DRONES: Drone[] = [
  {
    id: 'DR-001',
    name: 'Radoko Relay 01',
    status: DroneStatus.ReadyForTrial,
    countryId: 'madagascar',
    role: 'Camera and communication relay (proposed)',
    model: 'Demonstration airframe A',
    serialNumber: 'DEMO-AIRFRAME-001',
    readiness: readiness(true),
    lastFlightAt: null,
    flightHours: null,
    notes:
      'No flight has been conducted. “Ready for field trial” reflects bench checks only and must not be read as airworthiness or clinical readiness.',
    assignedEncounterId: null,
    activityLog: [
      {
        timestamp: daysAgo(2),
        event: 'Readiness record updated',
        details: 'Bench checks recorded as simulated. No flight evidence.',
        evidenceClass: 'simulated',
      },
      {
        timestamp: daysAgo(12),
        event: 'Registered to demonstration fleet',
        details: 'No procurement or airworthiness documentation attached.',
        evidenceClass: 'working',
      },
    ],
  },
  {
    id: 'DR-002',
    name: 'Radoko Relay 02',
    status: DroneStatus.Maintenance,
    countryId: 'madagascar',
    role: 'Camera and communication relay (proposed)',
    model: 'Demonstration airframe A',
    serialNumber: 'DEMO-AIRFRAME-002',
    readiness: [
      {
        id: 'airframe',
        label: 'Airframe and propeller inspection',
        status: 'Failed',
        evidence: 'Demonstration fault recorded: cracked propeller guard. Not flown.',
        checkedAt: daysAgo(6),
        checkedBy: 'U-FO-LOVA',
        evidenceClass: 'simulated',
      },
      ...readiness(false).slice(1),
    ],
    lastFlightAt: null,
    flightHours: null,
    notes: 'Maintenance demonstration record. No real aircraft is operated by this repository.',
    assignedEncounterId: null,
    activityLog: [
      {
        timestamp: daysAgo(6),
        event: 'Readiness check failed',
        details: 'Cracked propeller guard in demonstration record.',
        evidenceClass: 'simulated',
      },
    ],
  },
];


export const SEED_DATA: AppData = {
  schemaVersion: 3,
  patients: PATIENTS,
  encounters: ENCOUNTERS,
  countries: COUNTRIES,
  drones: DRONES,
  facilities: FACILITIES,
  administrativeAreas: ADMINISTRATIVE_AREAS,
  users: USERS,
  mothers: MOTHERS
};

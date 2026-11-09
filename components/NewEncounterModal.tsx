import React, { useMemo, useState } from 'react';
import {
  AdministrativeArea,
  ConsentRecord,
  Country,
  Encounter,
  EquipmentMode,
  Facility,
  Mother,
  Patient,
  UserAccount,
} from '../types';
import { createEmptyObservations, OBSERVATION_BY_ID } from '../data/observations';
import { getConcernRecommendations, REPORTED_CONCERN_OPTIONS } from '../data/reportedConcerns';
import {
  createEncounterRecord,
  createMotherRecord,
  createPatientRecord,
} from '../services/clinicalWorkflow';
import { Notice } from './Badges';

interface NewEncounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (mother: Mother, patient: Patient, encounter: Encounter) => void;
  user: UserAccount;
  facilities: Facility[];
  administrativeAreas?: AdministrativeArea[];
  countries: Country[];
}

const consentScope =
  'Remote assessment, consent-based image capture, physician review, follow-up contact, and recording of the outcome. Includes maternal needs and wellbeing observations only where the local protocol includes them. Synthetic demonstration data only.';

const NewEncounterModal: React.FC<NewEncounterModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  user,
  facilities,
  administrativeAreas = [],
  countries,
}) => {
  const pilotCountry = countries.find((c) => c.isImplemented) ?? countries[0];
  const configuredCountry = countries.find((country) => country.isImplemented) ?? countries[0];
  const clinicalFacilities = useMemo(
    () =>
      facilities.filter(
        (f) => f.countryId === pilotCountry?.id && f.level !== 'Community outreach team',
      ),
    [facilities, pilotCountry],
  );
  const defaultCsbs = clinicalFacilities.filter((f) => f.level === 'CSB I' || f.level === 'CSB II');

  // ------------------------------------------------------------------
  // ALL hooks must run unconditionally, BEFORE any early return.
  // ------------------------------------------------------------------
  const [name, setName] = useState('');
  const [ageDays, setAgeDays] = useState('14');
  const [sex, setSex] = useState<Patient['sex']>('Female');
  const [village, setVillage] = useState('');
  const [fokontany, setFokontany] = useState('');
  const [villageAreaId, setVillageAreaId] = useState('');
  const [fokontanyAreaId, setFokontanyAreaId] = useState('');
  const [communeAreaId, setCommuneAreaId] = useState('');
  const [faritanyAreaId, setFaritanyAreaId] = useState('');
  const [regionAreaId, setRegionAreaId] = useState('');
  const [districtAreaId, setDistrictAreaId] = useState('');
  const [commune, setCommune] = useState('');
  const [district, setDistrict] = useState('');
  const [region, setRegion] = useState('');
  const [faritany, setFaritany] = useState('');
  const [districtReferralFacilityId, setDistrictReferralFacilityId] = useState('');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [otherConcern, setOtherConcern] = useState('');
  const [externalRef, setExternalRef] = useState('');
  // A CSB is selected only after the household commune is known.
  const [facilityId, setFacilityId] = useState('');
  const [equipmentMode, setEquipmentMode] =
    useState<EquipmentMode>('Community teleconsultation');
  const [consent, setConsent] = useState(false);
  const [imageConsent, setImageConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mother / caregiver fields
  const [motherName, setMotherName] = useState('');
  const [motherAge, setMotherAge] = useState('');
  const [motherIsCaregiver, setMotherIsCaregiver] = useState(true);
  const [otherCaregiverName, setOtherCaregiverName] = useState('');
  const [otherCaregiverRelationship, setOtherCaregiverRelationship] =
    useState('Father');
  const [maternalNeeds, setMaternalNeeds] = useState('');
  const [localFacilityDirectory, setLocalFacilityDirectory] = useState<Facility[]>([]);

  if (!isOpen) return null;

  const age = Number(ageDays);
  const ageInvalid = !Number.isFinite(age) || age < 0 || age > 59;
  const csbs = clinicalFacilities.filter((facility) => facility.level === 'CSB I' || facility.level === 'CSB II');
  const areaById = new Map(administrativeAreas.map((area) => [area.id, area]));
  const faritanyOptions = administrativeAreas.filter((area) => area.level === 'Faritany');
  const regionOptions = administrativeAreas.filter((area) => area.level === 'Faritra' && area.parentId === faritanyAreaId);
  const districtOptions = administrativeAreas.filter((area) => area.level === 'Distrika' && area.parentId === regionAreaId);
  const currentDistrictArea = administrativeAreas.find((area) => area.id === districtAreaId);
  const availableCommunes = administrativeAreas.filter((area) => area.level === 'Kaominina' && area.parentId === currentDistrictArea?.id);
  const availableFokontany = administrativeAreas.filter((area) => area.level === 'Fokontany' && area.parentId === communeAreaId);
  const availableVillages = administrativeAreas.filter((area) => area.level === 'Vohitra/Kartie' && area.parentId === fokontanyAreaId);
  const communeFacilities = [...csbs, ...localFacilityDirectory].filter((facility) => facility.communeAreaId === communeAreaId);
  const selectedCommuneCsB = communeFacilities.find((facility) => facility.id === facilityId) ?? null;
  const selectedCsB = selectedCommuneCsB;
  const districtReferral = clinicalFacilities.find((facility) => facility.id === `FAC-CHD/CHRD-${districtAreaId}` && facility.level === 'CHD/CHRD');
  const regionalReferral = clinicalFacilities.find((facility) => facility.id === `FAC-CHR/CHRR-REG-${faritany}-${region}` && facility.level === 'CHR/CHRR');
  const provincialReferral = clinicalFacilities.find((facility) => facility.id === `FAC-CHU-FAR-${faritany}` && facility.level === 'CHU');
  const selectedConcernOptions = REPORTED_CONCERN_OPTIONS.filter((option) => selectedConcerns.includes(option.id));
  const selectedUrgentConcern = selectedConcernOptions.some((option) => option.urgentCareCue);
  const concernRecommendations = getConcernRecommendations(selectedConcernOptions.map((option) => option.label));

  // Single source of truth for the patient's caregiver.
  const effectiveCaregiverName = (
    motherIsCaregiver ? motherName : otherCaregiverName
  ).trim();
  const effectiveCaregiverRelationship = motherIsCaregiver
    ? 'Mother'
    : otherCaregiverRelationship;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!pilotCountry) {
      setError('No pilot country is configured.');
      return;
    }
    if (ageInvalid) {
      setError(
        'The first pilot supports young infants aged 0–59 days only. Refer older children to the standard pathway.',
      );
      return;
    }
    if (!consent) {
      setError('Consent is required before an encounter can be created.');
      return;
    }
    if (!name.trim() || !village.trim() || !fokontany.trim() || !district.trim() || !commune.trim() || !communeAreaId || !facilityId) {
      setError(
        'Complete the infant name, village, and receiving facility fields.',
      );
      return;
    }
    const selectedFacility = communeFacilities.find((facility) => facility.id === facilityId);
    if (!selectedFacility || selectedFacility.communeAreaId !== communeAreaId || !districtAreaId) {
      setError('Choose a commune CSB that matches the selected commune and district.');
      return;
    }
    if (!motherName.trim()) {
      setError(
        'A mother record is required so mother and infant remain linked to one care episode.',
      );
      return;
    }
    if (!effectiveCaregiverName) {
      setError('The primary caregiver name is required.');
      return;
    }

    const mother = createMotherRecord({
      name: motherName.trim(),
      ageYears: motherAge ? Number(motherAge) : null,
      village: village.trim(),
      villageAreaId,
      fokontany: fokontany.trim(),
      fokontanyAreaId,
      commune: commune.trim(),
      communeAreaId,
      district: district.trim(),
      districtAreaId,
      region: region.trim(),
      regionAreaId,
      faritany: faritany.trim(),
      faritanyAreaId,
      countryId: pilotCountry.id,
      reportedNeeds: maternalNeeds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      createdBy: user.id,
      isPrimaryCaregiver: motherIsCaregiver,
    });

    const consentRecord: ConsentRecord = {
      obtained: true,
      obtainedBy: user.id,
      obtainedAt: new Date().toISOString(),
      scope: consentScope,
      imageCaptureAllowed: imageConsent,
    };

    const patient = createPatientRecord({
      motherId: mother.id,
      name: name.trim(),
      ageDays: age,
      sex,
      caregiverName: effectiveCaregiverName,
      caregiverRelationship: effectiveCaregiverRelationship,
      village: village.trim(),
      villageAreaId,
      fokontany: fokontany.trim(),
      fokontanyAreaId,
      commune: commune.trim(),
      communeAreaId,
      district: district.trim(),
      districtAreaId,
      region: region.trim(),
      regionAreaId,
      faritany: faritany.trim(),
      faritanyAreaId,
      countryId: pilotCountry.id,
      reportedConcerns: [
        ...selectedConcernOptions.map((option) => option.label),
        ...(selectedConcerns.includes('other') && otherConcern.trim() ? [otherConcern.trim()] : []),
      ],
      createdBy: user.id,
      externalRecordRef: externalRef.trim() || undefined,
    });

    const encounter = createEncounterRecord({
      motherId: mother.id,
      patientId: patient.id,
      countryId: pilotCountry.id,
      facilityId,
      communeFacilityId: selectedFacility.id,
      districtReferralFacilityId: districtReferral?.id,
      regionalReferralFacilityId: regionalReferral?.id,
      provincialReferralFacilityId: provincialReferral?.id,
      createdBy: user.id,
      equipmentMode,
      observationTemplate: createEmptyObservations(),
      consent: consentRecord,
    });

    onCreate(mother, patient, encounter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="surface-card flex max-h-[92vh] w-full max-w-3xl flex-col">
        <div className="border-b border-brand-secondary/25 p-5">
          <p className="eyebrow">New encounter</p>
          <h2 className="mt-1 text-xl font-bold text-brand-text-primary">
            Register a young-infant encounter
          </h2>
          <p className="mt-1 text-sm text-brand-text-secondary">
            The first pilot is deliberately narrow: infants aged 0–59 days in
            the pilot district. Consent is recorded before any assessment.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            {error && <Notice tone="critical">{error}</Notice>}

            <section className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="label-field" htmlFor="patient-name">
                  Infant name or pseudonym
                </label>
                <input
                  id="patient-name"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Baby Aisha (synthetic)"
                  required
                />
              </div>
              <div>
                <label className="label-field" htmlFor="patient-age">
                  Age in days
                </label>
                <input
                  id="patient-age"
                  type="number"
                  min={0}
                  max={59}
                  className="input-field"
                  value={ageDays}
                  onChange={(e) => setAgeDays(e.target.value)}
                  required
                />
                <p
                  className={`mt-1 text-[11px] ${
                    ageInvalid
                      ? 'text-status-red'
                      : 'text-brand-text-secondary/80'
                  }`}
                >
                  0–59 days only.{' '}
                  {ageInvalid
                    ? 'This age is outside the intended use.'
                    : 'Young-infant IMCI applies.'}
                </p>
              </div>
              <div>
                <label className="label-field" htmlFor="patient-sex">
                  Sex
                </label>
                <select
                  id="patient-sex"
                  className="input-field"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Patient['sex'])}
                >
                  <option>Female</option>
                  <option>Male</option>
                  <option>Unknown</option>
                </select>
              </div>
              <div><label className="label-field" htmlFor="faritany">Level 1 · Faritany</label><select id="faritany" className="input-field" value={faritanyAreaId} onChange={(e) => { const area=areaById.get(e.target.value); setFaritanyAreaId(e.target.value); setFaritany(area?.name ?? ''); setRegionAreaId(''); setRegion(''); setDistrictAreaId(''); setDistrict(''); setCommuneAreaId(''); setCommune(''); setFacilityId(''); setFokontanyAreaId(''); setVillageAreaId(''); }} required><option value="">Choose Faritany</option>{faritanyOptions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div><label className="label-field" htmlFor="region">Level 2 · Faritra / Region</label><select id="region" className="input-field" value={regionAreaId} onChange={(e) => { const area=areaById.get(e.target.value); setRegionAreaId(e.target.value); setRegion(area?.name ?? ''); setDistrictAreaId(''); setDistrict(''); setCommuneAreaId(''); setCommune(''); setFacilityId(''); setFokontanyAreaId(''); setVillageAreaId(''); }} required disabled={!faritanyAreaId}><option value="">Choose Region</option>{regionOptions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div><label className="label-field" htmlFor="district">Level 3 · Distrika</label><select id="district" className="input-field" value={districtAreaId} onChange={(e) => { const area=areaById.get(e.target.value); setDistrictAreaId(e.target.value); setDistrict(area?.name ?? ''); setCommuneAreaId(''); setCommune(''); setFacilityId(''); setFokontanyAreaId(''); setVillageAreaId(''); }} required disabled={!regionAreaId}><option value="">Choose District</option>{districtOptions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div><label className="label-field" htmlFor="commune">Level 4 · Kaominina / Commune</label>
                <select id="commune" className="input-field" value={communeAreaId} onChange={(e) => {
                  const nextId = e.target.value;
                  const area = areaById.get(nextId);
                  setCommuneAreaId(nextId); setCommune(area?.name ?? ''); setFokontanyAreaId(''); setFokontany(''); setVillageAreaId(''); setVillage(''); setFacilityId('');
                }} required>
                  <option value="">Select commune</option>
                  {availableCommunes.map((area) => <option key={area.id} value={area.id}>{area.name} {area.sourceStatus === 'Demo placeholder' ? '(demo)' : ''}</option>)}
                </select>
              </div>
              <div><label className="label-field" htmlFor="fokontany">Level 5 · Fokontany</label>
                {availableFokontany.length ? <select id="fokontany" className="input-field" value={fokontanyAreaId} onChange={(e) => {
                  const area = areaById.get(e.target.value); setFokontanyAreaId(e.target.value); setFokontany(area?.name ?? ''); setVillageAreaId(''); setVillage('');
                }} required disabled={!communeAreaId}>
                  <option value="">Select fokontany</option>
                  {availableFokontany.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                </select> : <input id="fokontany" className="input-field" value={fokontany} onChange={(e) => setFokontany(e.target.value)} placeholder="Enter fokontany name" required disabled={!communeAreaId} />}
              </div>
              <div><label className="label-field" htmlFor="village">Level 6 · Vohitra / Village / Kartie</label>
                {availableVillages.length ? <select id="village" className="input-field" value={villageAreaId} onChange={(e) => {
                  const area = areaById.get(e.target.value); setVillageAreaId(e.target.value); setVillage(area?.name ?? '');
                }} required disabled={!fokontanyAreaId}>
                  <option value="">Select village</option>
                  {availableVillages.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                </select> : <input id="village" className="input-field" value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Enter village or neighborhood name" required disabled={!communeAreaId} />}
              </div>
              <div className="md:col-span-2">
                <label className="label-field" htmlFor="external-ref">
                  Existing record reference (optional)
                </label>
                <input
                  id="external-ref"
                  className="input-field"
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  placeholder="e.g. CommCare / facility record ID"
                />
                <p className="mt-1 text-[11px] text-brand-text-secondary/80">
                  Link to an existing record to avoid duplicate patient
                  registration.
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="label-field">Reported concerns (select all that apply)</p>
                <p className="mb-2 text-[11px] text-brand-text-secondary/80">
                  A selection prioritizes a proposed observation checklist. It does not classify the infant or decide treatment.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {REPORTED_CONCERN_OPTIONS.map((option) => (
                    <label key={option.id} className="flex items-start gap-2 rounded-lg border border-brand-secondary/20 bg-brand-background/30 p-2 text-xs text-brand-text-secondary">
                      <input
                        type="checkbox"
                        checked={selectedConcerns.includes(option.id)}
                        onChange={(e) => setSelectedConcerns((current) => e.target.checked
                          ? [...current, option.id]
                          : current.filter((id) => id !== option.id))}
                        className="mt-0.5"
                      />
                      <span>{option.label}{option.urgentCareCue && <strong className="ml-1 text-status-red">· urgent cue</strong>}</span>
                    </label>
                  ))}
                </div>
                {selectedConcerns.includes('other') && (
                  <input
                    id="other-concern"
                    className="input-field mt-2"
                    value={otherConcern}
                    onChange={(e) => setOtherConcern(e.target.value)}
                    placeholder="Record the caregiver’s words"
                    aria-label="Describe other reported concern"
                  />
                )}
                {selectedUrgentConcern && (
                  <Notice tone="critical" title="Potential danger sign reported">
                    Arrange same-day in-person care now using the urgent-care pathway. Do not wait for the AI draft or a drone. A clinician must assess and decide; this prompt is not an automated classification.
                  </Notice>
                )}
                {selectedConcernOptions.length > 0 && (
                  <div className="mt-2 rounded-lg border border-brand-primary/25 bg-brand-primary/5 p-3">
                    <p className="text-xs font-semibold text-brand-text-primary">After registration, prioritize these observations</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {concernRecommendations.prioritizedObservationIds.map((id) => {
                        const observation = OBSERVATION_BY_ID.get(id);
                        return observation ? <span key={id} className="badge bg-brand-background text-brand-primary">{observation.label}</span> : null;
                      })}
                    </div>
                    <p className="mt-2 text-[10px] text-brand-text-secondary">Core danger-sign checks remain included. This checklist is a proposed navigation aid pending clinical review.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-brand-secondary/25 bg-brand-background/40 p-4">
              <div>
                <p className="eyebrow">Linked mother record</p>
                <p className="mt-1 text-xs text-brand-text-secondary">
                  Mother and infant are separate people. Observations and plans
                  are recorded separately; the encounter links both.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="label-field" htmlFor="mother-name">
                    Mother name or pseudonym
                  </label>
                  <input
                    id="mother-name"
                    className="input-field"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label-field" htmlFor="mother-age">
                    Mother age (years, optional)
                  </label>
                  <input
                    id="mother-age"
                    type="number"
                    min={12}
                    max={60}
                    className="input-field"
                    value={motherAge}
                    onChange={(e) => setMotherAge(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-brand-text-secondary md:col-span-2">
                  <input
                    type="checkbox"
                    checked={motherIsCaregiver}
                    onChange={(e) => setMotherIsCaregiver(e.target.checked)}
                  />
                  The mother is the primary caregiver for this infant.
                </label>
                {!motherIsCaregiver && (
                  <>
                    <div>
                      <label className="label-field" htmlFor="other-caregiver">
                        Primary caregiver name
                      </label>
                      <input
                        id="other-caregiver"
                        className="input-field"
                        value={otherCaregiverName}
                        onChange={(e) => setOtherCaregiverName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label-field" htmlFor="other-rel">
                        Relationship to infant
                      </label>
                      <select
                        id="other-rel"
                        className="input-field"
                        value={otherCaregiverRelationship}
                        onChange={(e) =>
                          setOtherCaregiverRelationship(e.target.value)
                        }
                      >
                        <option>Father</option>
                        <option>Grandmother</option>
                        <option>Other caregiver</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="md:col-span-2">
                  <label className="label-field" htmlFor="maternal-needs">
                    Maternal needs reported (comma separated)
                  </label>
                  <input
                    id="maternal-needs"
                    className="input-field"
                    value={maternalNeeds}
                    onChange={(e) => setMaternalNeeds(e.target.value)}
                    placeholder="e.g. breastfeeding support, low mood, food insecurity"
                  />
                  <p className="mt-1 text-[11px] text-brand-text-secondary/80">
                    Collected only where the local protocol includes maternal
                    wellbeing and consent covers it.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label-field" htmlFor="facility">Commune CSB for initial care</label>
                <select id="facility" className="input-field" value={facilityId} onChange={(e) => setFacilityId(e.target.value)} required disabled={!communeAreaId}>
                  <option value="">Choose registered CSB for commune</option>
                  {communeFacilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} — {facility.level}</option>)}
                </select>
                {!communeFacilities.length && <p className="mt-1 text-xs text-brand-text-secondary">No CSB is mapped for this commune in the current directory. You can record the household location, but a receiving facility must be added before encounter creation.</p>}
              </div>
              <div className="md:col-span-2 rounded-xl border border-brand-secondary/25 bg-brand-background/40 p-4">
                <p className="eyebrow">Referral pathway (directory/demo)</p>
                <ol className="mt-2 space-y-1 text-sm text-brand-text-secondary">
                  <li>Community health site: {fokontany ? `Fokontany ${fokontany} (facility not listed)` : 'select household fokontany'}</li>
                  <li>Commune: {selectedCsB?.name ?? 'select commune CSB'}</li>
                  <li>District: {districtReferral?.name ?? 'no district referral facility configured'}</li>
                  <li>Region: {regionalReferral?.name ?? 'regional referral destination requires verification'}</li>
                  <li>Faritany: {provincialReferral?.name ?? 'CHU option is unconfirmed for this pathway'}</li>
                </ol>
                <p className="mt-2 text-[11px] text-brand-text-secondary/80">Do not use the displayed draft referral chain for real care until the facility directory and referral agreements are verified.</p>
              </div>
              <div>
                <label className="label-field" htmlFor="equipment">
                  Equipment mode
                </label>
                <select
                  id="equipment"
                  className="input-field"
                  value={equipmentMode}
                  onChange={(e) =>
                    setEquipmentMode(e.target.value as EquipmentMode)
                  }
                >
                  <option>Community teleconsultation</option>
                  <option>Drone-assisted outreach</option>
                  <option>Facility visit</option>
                </select>
                <p className="mt-1 text-[11px] leading-relaxed text-brand-text-secondary/80">
                  The clinical pathway must remain usable when a flight is not
                  possible. The drone is optional.
                </p>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-brand-secondary/25 bg-brand-background/40 p-4">
              <label className="flex items-start gap-3 text-sm text-brand-text-secondary">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-brand-secondary/50 bg-brand-background text-brand-primary"
                />
                <span>
                  <span className="font-semibold text-brand-text-primary">
                    Consent recorded.
                  </span>{' '}
                  The caregiver agrees to remote assessment, physician review,
                  and follow-up contact. Scope: {consentScope}
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-brand-text-secondary">
                <input
                  type="checkbox"
                  checked={imageConsent}
                  onChange={(e) => setImageConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-brand-secondary/50 bg-brand-background text-brand-primary"
                />
                <span>
                  <span className="font-semibold text-brand-text-primary">
                    Image capture allowed.
                  </span>{' '}
                  Optional. If declined, the assessment can continue without
                  images and visual observations must be marked not assessed or
                  in person only.
                </span>
              </label>
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-brand-secondary/25 p-4">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={ageInvalid || !consent}
            >
              Create encounter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewEncounterModal;

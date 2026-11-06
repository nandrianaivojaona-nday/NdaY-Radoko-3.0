import React, { useMemo, useState } from 'react';
import {
  ConsentRecord,
  Country,
  Encounter,
  EquipmentMode,
  Facility,
  Mother,
  Patient,
  UserAccount,
} from '../types';
import { createEmptyObservations } from '../data/observations';
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
  const defaultFacility =
    clinicalFacilities.find((f) => f.id === user.facilityId)?.id ??
    clinicalFacilities[0]?.id ??
    '';

  // ------------------------------------------------------------------
  // ALL hooks must run unconditionally, BEFORE any early return.
  // ------------------------------------------------------------------
  const [name, setName] = useState('');
  const [ageDays, setAgeDays] = useState('14');
  const [sex, setSex] = useState<Patient['sex']>('Female');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [concerns, setConcerns] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [facilityId, setFacilityId] = useState(defaultFacility);
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

  if (!isOpen) return null;

  const age = Number(ageDays);
  const ageInvalid = !Number.isFinite(age) || age < 0 || age > 59;

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
    if (!name.trim() || !village.trim() || !facilityId) {
      setError(
        'Complete the infant name, village, and receiving facility fields.',
      );
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
      district: district.trim(),
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
      district: district.trim(),
      countryId: pilotCountry.id,
      reportedConcerns: concerns
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      createdBy: user.id,
      externalRecordRef: externalRef.trim() || undefined,
    });

    const encounter = createEncounterRecord({
      motherId: mother.id,
      patientId: patient.id,
      countryId: pilotCountry.id,
      facilityId,
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
              <div>
                <label className="label-field" htmlFor="village">
                  Village
                </label>
                <input
                  id="village"
                  className="input-field"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label-field" htmlFor="district">
                  District
                </label>
                <input
                  id="district"
                  className="input-field"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  required
                />
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
                <label className="label-field" htmlFor="concerns">
                  Reported concerns (comma separated)
                </label>
                <input
                  id="concerns"
                  className="input-field"
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  placeholder="e.g. fever, poor feeding, fast breathing"
                />
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
                <label className="label-field" htmlFor="facility">
                  Receiving facility for physician review
                </label>
                <select
                  id="facility"
                  className="input-field"
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                >
                  {clinicalFacilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} — {facility.level}
                    </option>
                  ))}
                </select>
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
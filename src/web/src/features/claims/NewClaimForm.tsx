import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError, describeError, submitClaim } from '../../api/client';
import type { Peril, SubmitClaimRequest, ValidationError } from '../../api/types';
import { perilLabel, perils } from '../../lib/format';
import { navigate, routes } from '../../routing';

type FieldName =
  | 'policyNumber'
  | 'peril'
  | 'incidentDate'
  | 'claimedAmount'
  | 'description'
  | 'claimantName'
  | 'claimantEmail';

type FormValues = Record<FieldName, string>;

/** A message for one field, with the code that caused it (from the API, or FIELD_REQUIRED from the client check). */
interface FieldError {
  code: string;
  message: string;
}

type FieldErrors = Partial<Record<FieldName, FieldError>>;

const emptyForm: FormValues = {
  policyNumber: '',
  peril: '',
  incidentDate: '',
  claimedAmount: '',
  description: '',
  claimantName: '',
  claimantEmail: '',
};

const fieldOrder = Object.keys(emptyForm) as FieldName[];

const requiredMessages: Record<FieldName, string> = {
  policyNumber: 'Enter the policy number.',
  peril: 'Select the peril.',
  incidentDate: 'Enter the incident date.',
  claimedAmount: 'Enter the claimed amount.',
  description: 'Describe what happened.',
  claimantName: "Enter the claimant's name.",
  claimantEmail: "Enter the claimant's email address.",
};

export function NewClaimForm() {
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    if (!isFieldName(name)) {
      return;
    }
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    const missing = checkRequired(values);
    if (showFieldErrors(missing)) {
      return;
    }

    setSubmitting(true);
    try {
      const claim = await submitClaim(toRequest(values));
      navigate(routes.claim(claim.claimId));
    } catch (error) {
      const serverErrors = error instanceof ApiError ? toFieldErrors(error.problem?.errors ?? []) : {};
      if (!showFieldErrors(serverErrors)) {
        setFormError(describeError(error));
      }
      setSubmitting(false);
    }
  }

  // Shows the errors and moves focus to the first field that has one. Returns false when there are none.
  function showFieldErrors(fieldErrors: FieldErrors): boolean {
    const firstField = fieldOrder.find((field) => fieldErrors[field] !== undefined);
    if (firstField === undefined) {
      return false;
    }
    setErrors(fieldErrors);
    document.getElementById(firstField)?.focus();
    return true;
  }

  function errorFor(field: FieldName) {
    const error = errors[field];
    if (!error) {
      return null;
    }
    return (
      <p id={`${field}-error`} className="field-error" data-testid={`field-error-${field}`} data-code={error.code}>
        {error.message}
      </p>
    );
  }

  function describedBy(field: FieldName, hintId?: string): string | undefined {
    const ids = [hintId, errors[field] ? `${field}-error` : undefined].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  const hasFieldErrors = fieldOrder.some((field) => errors[field] !== undefined);

  return (
    <section aria-labelledby="new-claim-heading">
      <h1 id="new-claim-heading">New claim</h1>
      <p className="lead">All fields are required. The demo policies are POL-100001 to POL-100006.</p>

      <form className="claim-form" data-testid="new-claim-form" noValidate onSubmit={handleSubmit}>
        {hasFieldErrors && (
          <p role="alert" className="message message--error">
            Some details need correcting - see the messages below.
          </p>
        )}
        {formError && (
          <p role="alert" className="message message--error">
            {formError}
          </p>
        )}

        <fieldset>
          <legend>Incident</legend>

          <div className="field">
            <label htmlFor="policyNumber">Policy number</label>
            <input
              id="policyNumber"
              name="policyNumber"
              autoComplete="off"
              value={values.policyNumber}
              onChange={handleChange}
              aria-invalid={errors.policyNumber !== undefined}
              aria-describedby={describedBy('policyNumber')}
            />
            {errorFor('policyNumber')}
          </div>

          <div className="field">
            <label htmlFor="peril">Peril</label>
            <select
              id="peril"
              name="peril"
              value={values.peril}
              onChange={handleChange}
              aria-invalid={errors.peril !== undefined}
              aria-describedby={describedBy('peril')}
            >
              <option value="">Select a peril</option>
              {perils.map((peril) => (
                <option key={peril} value={peril}>
                  {perilLabel(peril)}
                </option>
              ))}
            </select>
            {errorFor('peril')}
          </div>

          <div className="field">
            <label htmlFor="incidentDate">Incident date</label>
            <input
              id="incidentDate"
              name="incidentDate"
              type="date"
              value={values.incidentDate}
              onChange={handleChange}
              aria-invalid={errors.incidentDate !== undefined}
              aria-describedby={describedBy('incidentDate')}
            />
            {errorFor('incidentDate')}
          </div>

          <div className="field">
            <label htmlFor="claimedAmount">Claimed amount</label>
            <p id="claimedAmount-hint" className="field-hint">
              In pounds, for example 1250.00
            </p>
            <input
              id="claimedAmount"
              name="claimedAmount"
              inputMode="decimal"
              autoComplete="off"
              value={values.claimedAmount}
              onChange={handleChange}
              aria-invalid={errors.claimedAmount !== undefined}
              aria-describedby={describedBy('claimedAmount', 'claimedAmount-hint')}
            />
            {errorFor('claimedAmount')}
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={values.description}
              onChange={handleChange}
              aria-invalid={errors.description !== undefined}
              aria-describedby={describedBy('description')}
            />
            {errorFor('description')}
          </div>
        </fieldset>

        <fieldset>
          <legend>Claimant</legend>

          <div className="field">
            <label htmlFor="claimantName">Claimant name</label>
            <input
              id="claimantName"
              name="claimantName"
              autoComplete="off"
              value={values.claimantName}
              onChange={handleChange}
              aria-invalid={errors.claimantName !== undefined}
              aria-describedby={describedBy('claimantName')}
            />
            {errorFor('claimantName')}
          </div>

          <div className="field">
            <label htmlFor="claimantEmail">Claimant email</label>
            <input
              id="claimantEmail"
              name="claimantEmail"
              type="email"
              autoComplete="off"
              value={values.claimantEmail}
              onChange={handleChange}
              aria-invalid={errors.claimantEmail !== undefined}
              aria-describedby={describedBy('claimantEmail')}
            />
            {errorFor('claimantEmail')}
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="button" data-testid="submit-claim" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit claim'}
          </button>
          <a href={routes.claims}>Cancel</a>
        </div>
      </form>
    </section>
  );
}

function isFieldName(name: string): name is FieldName {
  return (fieldOrder as string[]).includes(name);
}

function isPeril(value: string): value is Peril {
  return (perils as string[]).includes(value);
}

/** "1,250.00" or "£1250" -> 1250. Undefined when the text is not an amount of money. */
function parseAmount(text: string): number | undefined {
  const normalised = text.replace(/[£,\s]/g, '');
  return /^\d+(\.\d+)?$/.test(normalised) ? Number(normalised) : undefined;
}

// Client-side checks are only "is it filled in" and "is it a number"; the business rules are checked by the API.
function checkRequired(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fieldOrder) {
    if (values[field].trim() === '') {
      errors[field] = { code: 'FIELD_REQUIRED', message: requiredMessages[field] };
    }
  }
  if (errors.claimedAmount === undefined && parseAmount(values.claimedAmount) === undefined) {
    errors.claimedAmount = { code: 'FIELD_REQUIRED', message: 'Enter the amount in pounds, for example 1250.00.' };
  }
  return errors;
}

function toRequest(values: FormValues): SubmitClaimRequest {
  return {
    policyNumber: values.policyNumber.trim(),
    peril: isPeril(values.peril) ? values.peril : null,
    incidentDate: values.incidentDate,
    claimedAmount: parseAmount(values.claimedAmount) ?? null,
    description: values.description.trim(),
    claimantName: values.claimantName.trim(),
    claimantEmail: values.claimantEmail.trim(),
  };
}

function toFieldErrors(validationErrors: ValidationError[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const error of validationErrors) {
    if (!isFieldName(error.field)) {
      continue;
    }
    const existing = errors[error.field];
    errors[error.field] = existing
      ? { code: existing.code, message: `${existing.message} ${error.message}` }
      : { code: error.code, message: error.message };
  }
  return errors;
}

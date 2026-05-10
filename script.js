const trackEvent = window.MentorAnalytics?.track ?? (() => {});

const STORAGE_KEY = 'mentor-me-booking-state-v1';
const PHONE_REGEX = /^\+380\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERROR_DICTIONARY = {
  invalid_email_format: [
    'Enter a valid email address.',
    'Please check your email address.',
    'Email format is incorrect.',
  ],
  invalid_phone_format: [
    'Enter a Ukrainian phone number in +380XXXXXXXXX format.',
    'Please check that the phone starts with +380 and has 9 more digits.',
    'Phone format is incorrect for Ukraine.',
  ],
  slot_unavailable: [
    'Selected slot is no longer available.',
    'That time was just taken. Please choose another slot.',
    'This slot cannot be booked anymore.',
  ],
  consent_required: [
    'Consent is required to send booking notifications.',
    'Please agree to receive booking notifications.',
    'Check the consent box before continuing.',
  ],
  missing_required_field: [
    'This field is required.',
    'Please complete this required field.',
    'Add this information to continue.',
  ],
  invalid_parameter_type: [
    'The value has an unexpected format.',
    'Please enter this value in the requested format.',
    'This field needs a different value type.',
  ],
  booking_not_found: [
    'Booking could not be found.',
    'We could not locate this booking.',
    'This booking reference is unavailable.',
  ],
  invalid_booking_status: [
    'Booking must be confirmed before this action.',
    'This booking is not in a confirmed state.',
    'Booking status does not allow this action.',
  ],
  reminder_already_sent: [
    'A booking already exists for this email and slot.',
    'This looks like a duplicate booking.',
    'A reminder was already sent for this session.',
  ],
  internal_error: [
    'Something went wrong. Please try again.',
    'We hit a server problem. Try again in a moment.',
    'The booking service is temporarily unavailable.',
  ],
  invalid_date: [
    'Choose today or a later booking date.',
    'Booking date must be today or later.',
    'Past bookings are not available.',
  ],
};

const FIELD_LABELS = {
  start_at: 'Booking date',
  slot: 'Time slot',
  full_name: 'Full Name',
  email: 'Email',
  phone: 'Phone',
  notifications_enabled: 'Consent',
};

const FOCUS_TARGETS = {
  start_at: 'booking-date',
  slot: 'slot-options',
  full_name: 'full-name',
  email: 'email',
  phone: 'phone',
  notifications_enabled: 'consent',
};

const ERROR_TARGETS = {
  start_at: 'booking-date-error',
  slot: 'slot-error',
  full_name: 'full-name-error',
  email: 'email-error',
  phone: 'phone-error',
  notifications_enabled: 'consent-error',
};

const HELP_TARGETS = {
  start_at: 'booking-date-help',
  slot: 'slot-help',
  full_name: 'full-name-help',
  email: 'email-help',
  phone: 'phone-help',
  notifications_enabled: 'consent-help',
};

const SLOT_DATA = [
  { time: '09:00', available: true },
  { time: '10:30', available: true },
  { time: '12:00', available: false, reason: 'Unavailable' },
  { time: '15:00', available: true, risk: 'May conflict' },
  { time: '16:30', available: true },
];

const state = loadState();
const touchedFields = new Set();
let currentErrors = {};
let lastStep = state.currentStep;
let slotRenderRequest = 0;

const elements = {
  form: document.querySelector('#booking-form'),
  steps: [...document.querySelectorAll('.form-step')],
  progressSteps: [...document.querySelectorAll('[data-progress-step]')],
  errorSummary: document.querySelector('#error-summary'),
  errorSummaryList: document.querySelector('#error-summary-list'),
  globalStatus: document.querySelector('#global-status'),
  successPanel: document.querySelector('#success-panel'),
  successMessage: document.querySelector('#success-message'),
  resetFlow: document.querySelector('#reset-flow'),
  date: document.querySelector('#booking-date'),
  slotOptions: document.querySelector('#slot-options'),
  slotLoading: document.querySelector('#slot-loading'),
  slotEmpty: document.querySelector('#slot-empty'),
  step1Continue: document.querySelector('#step-1-continue'),
  step1ServerError: document.querySelector('#step-1-server-error'),
  step3ServerError: document.querySelector('#step-3-server-error'),
  fullName: document.querySelector('#full-name'),
  email: document.querySelector('#email'),
  phone: document.querySelector('#phone'),
  consent: document.querySelector('#consent'),
  confirmDate: document.querySelector('#confirm-date'),
  confirmSlot: document.querySelector('#confirm-slot'),
  confirmName: document.querySelector('#confirm-name'),
  confirmEmail: document.querySelector('#confirm-email'),
  confirmPhone: document.querySelector('#confirm-phone'),
  confirmButton: document.querySelector('#confirm-booking'),
};

function createDefaultState() {
  return {
    currentStep: 1,
    fields: {
      full_name: '',
      email: '',
      phone: '',
      start_at: '',
      slot: '',
      notifications_enabled: false,
    },
    apiSimulation: 'success',
    booking: null,
  };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored ? { ...createDefaultState(), ...stored, fields: { ...createDefaultState().fields, ...stored.fields } } : createDefaultState();
  } catch {
    return createDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getMessage(errorCode, variantIndex = 0) {
  return ERROR_DICTIONARY[errorCode]?.[variantIndex] ?? 'Please review this field.';
}

function makeError(field, errorCode, message = getMessage(errorCode)) {
  return { field, error_code: errorCode, message };
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromInput(value) {
  if (!value || typeof value !== 'string') return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isTodayOrFutureDate(value) {
  const selected = dateFromInput(value);
  return selected instanceof Date && !Number.isNaN(selected.valueOf()) && selected >= todayStart();
}

function getSlotStart(value, slotTime) {
  const date = dateFromInput(value);
  if (!date || !slotTime) return null;
  const [hours, minutes] = slotTime.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function isFutureSlot(value, slotTime) {
  const start = getSlotStart(value, slotTime);
  return start instanceof Date && !Number.isNaN(start.valueOf()) && start > new Date();
}

function toStartAtIso() {
  return getSlotStart(state.fields.start_at, state.fields.slot)?.toISOString() ?? '';
}

function validateStep1(fields) {
  const errors = {};
  if (!fields.start_at) {
    errors.start_at = makeError('start_at', 'missing_required_field', 'Choose a booking date.');
  } else if (!isTodayOrFutureDate(fields.start_at)) {
    errors.start_at = makeError('start_at', 'invalid_date');
  }

  if (!fields.slot) {
    errors.slot = makeError('slot', 'missing_required_field', 'Choose an available time slot.');
  } else if (!isFutureSlot(fields.start_at, fields.slot)) {
    errors.slot = makeError('slot', 'invalid_date', 'Choose a future time slot.');
  }

  return errors;
}

function validateStep2(fields) {
  const errors = {};
  if (!fields.full_name.trim()) {
    errors.full_name = makeError('full_name', 'missing_required_field', 'Enter your full name.');
  }

  if (!fields.email.trim()) {
    errors.email = makeError('email', 'missing_required_field', 'Enter your email address.');
  } else if (!EMAIL_REGEX.test(fields.email.trim())) {
    errors.email = makeError('email', 'invalid_email_format');
  }

  if (!fields.phone.trim()) {
    errors.phone = makeError('phone', 'missing_required_field', 'Enter your phone number.');
  } else if (!PHONE_REGEX.test(fields.phone.trim())) {
    errors.phone = makeError('phone', 'invalid_phone_format');
  }

  if (!fields.notifications_enabled) {
    errors.notifications_enabled = makeError('notifications_enabled', 'consent_required');
  }

  return errors;
}

function validateAll(fields) {
  return { ...validateStep1(fields), ...validateStep2(fields) };
}

function validateField(field) {
  if (field === 'start_at' || field === 'slot') return validateStep1(state.fields)[field];
  return validateStep2(state.fields)[field];
}

function getStepErrors(step) {
  if (step === 1) return validateStep1(state.fields);
  if (step === 2) return validateStep2(state.fields);
  return validateAll(state.fields);
}

function isStep1LocallyValid() {
  return Object.keys(validateStep1(state.fields)).length === 0;
}

function updateInputValues() {
  elements.date.value = state.fields.start_at;
  elements.date.classList.toggle('has-value', Boolean(state.fields.start_at));
  elements.fullName.value = state.fields.full_name;
  elements.email.value = state.fields.email;
  elements.phone.value = state.fields.phone;
  elements.consent.checked = state.fields.notifications_enabled;
  document.querySelectorAll('input[name="api_simulation"]').forEach((input) => {
    input.checked = input.value === state.apiSimulation;
  });
}

function updateProgress() {
  elements.progressSteps.forEach((step) => {
    const stepNumber = Number(step.dataset.progressStep);
    step.classList.toggle('is-active', stepNumber === state.currentStep);
    step.classList.toggle('is-complete', stepNumber < state.currentStep || Boolean(state.booking));
    step.setAttribute('aria-current', stepNumber === state.currentStep ? 'step' : 'false');
  });
}

function showStep(step, focus = true) {
  if (lastStep !== step) {
    trackEvent('abandon_step', {
      step: lastStep,
      next_step: step,
      field_count_completed: Object.values(state.fields).filter(Boolean).length,
      timestamp: Date.now(),
    });
    lastStep = step;
  }

  state.currentStep = step;
  elements.steps.forEach((section) => {
    section.classList.toggle('hidden', Number(section.dataset.step) !== step);
  });
  elements.successPanel.classList.add('hidden');
  elements.form.classList.remove('hidden');
  clearSummary();
  updateProgress();
  renderConfirmation();
  saveState();

  if (focus) {
    const heading = document.querySelector(`#step-${step}-title`);
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }
}

function renderSlots() {
  const requestId = ++slotRenderRequest;
  elements.slotOptions.innerHTML = '';
  elements.slotEmpty.classList.add('hidden');

  if (!isTodayOrFutureDate(state.fields.start_at)) {
    elements.slotLoading.classList.add('hidden');
    return;
  }

  elements.slotLoading.classList.remove('hidden');

  window.setTimeout(() => {
    if (requestId !== slotRenderRequest) return;

    elements.slotOptions.innerHTML = '';
    elements.slotLoading.classList.add('hidden');
    const visibleSlots = SLOT_DATA.filter((slot) => isFutureSlot(state.fields.start_at, slot.time));
    const availableSlots = visibleSlots.filter((slot) => slot.available);
    elements.slotEmpty.classList.toggle('hidden', availableSlots.length > 0);

    visibleSlots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot-button';
      button.dataset.slot = slot.time;
      button.textContent = slot.risk ? `${slot.time} (${slot.risk})` : slot.time;
      button.disabled = !slot.available;
      button.setAttribute('aria-pressed', String(state.fields.slot === slot.time));
      if (!slot.available) button.setAttribute('aria-label', `${slot.time}, unavailable`);
      button.addEventListener('click', () => {
        state.fields.slot = slot.time;
        touchedFields.add('slot');
        clearServerErrors();
        saveState();
        renderSlots();
        renderFieldErrors({ ...currentErrors, slot: validateField('slot') });
        updateStep1Continue();
      });
      elements.slotOptions.append(button);
    });
  }, 350);
}

function renderFieldErrors(errors = {}) {
  currentErrors = Object.fromEntries(Object.entries(errors).filter(([, error]) => Boolean(error)));

  Object.keys(ERROR_TARGETS).forEach((field) => {
    const errorElement = document.querySelector(`#${ERROR_TARGETS[field]}`);
    const input = document.querySelector(`#${FOCUS_TARGETS[field]}`);
    const error = currentErrors[field];

    errorElement.textContent = error?.message ?? '';

    if (input) {
      if (input.matches('input')) {
        input.setAttribute('aria-invalid', String(Boolean(error)));
        input.setAttribute('aria-describedby', `${HELP_TARGETS[field]} ${ERROR_TARGETS[field]}`);
      }
    }
  });
}

function clearSummary() {
  elements.errorSummary.classList.add('hidden');
  elements.errorSummaryList.innerHTML = '';
}

function showErrorSummary(errors) {
  clearSummary();
  const normalizedErrors = Object.values(errors).filter(Boolean);
  if (!normalizedErrors.length) return;

  normalizedErrors.forEach((error) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${FOCUS_TARGETS[error.field]}`;
    link.textContent = `${FIELD_LABELS[error.field]}: ${error.message}`;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelector(`#${FOCUS_TARGETS[error.field]}`)?.focus();
    });
    item.append(link);
    elements.errorSummaryList.append(item);
  });

  elements.errorSummary.classList.remove('hidden');
  // Accessibility behavior: move focus to the assertive summary so keyboard and screen reader users hear all failures first.
  elements.errorSummary.focus();
}

function logValidation(step, errors, duration) {
  trackEvent('validation_time_ms', {
    step,
    duration_ms: duration,
    error_count: Object.keys(errors).length,
    timestamp: Date.now(),
  });

  Object.values(errors).forEach((error) => {
    trackEvent('form_error', {
      step,
      field: error.field,
      error_code: error.error_code,
      timestamp: Date.now(),
    });
  });
}

function validateAndRenderStep(step, focusSummary = true) {
  const startedAt = performance.now();
  const errors = getStepErrors(step);
  logValidation(step, errors, Math.round(performance.now() - startedAt));
  renderFieldErrors(errors);
  if (focusSummary) showErrorSummary(errors);
  return errors;
}

function updateStep1Continue() {
  elements.step1Continue.disabled = !isStep1LocallyValid();
}

function clearServerErrors() {
  elements.step1ServerError.classList.add('hidden');
  elements.step1ServerError.textContent = '';
  elements.step3ServerError.classList.add('hidden');
  elements.step3ServerError.textContent = '';
}

function showServerError(target, errorResponse) {
  const trace = errorResponse.trace_id ? ` Trace ID: ${errorResponse.trace_id}` : '';
  target.textContent = `${errorResponse.message}${trace}`;
  target.classList.remove('hidden');
  target.focus?.();
  trackEvent('form_error', {
    step: state.currentStep,
    field: errorResponse.details?.field ?? 'form',
    error_code: errorResponse.error_code,
    trace_id: errorResponse.trace_id,
    timestamp: Date.now(),
  });
}

function renderConfirmation() {
  elements.confirmDate.textContent = state.fields.start_at || '—';
  elements.confirmSlot.textContent = state.fields.slot || '—';
  elements.confirmName.textContent = state.fields.full_name || '—';
  elements.confirmEmail.textContent = state.fields.email || '—';
  elements.confirmPhone.textContent = state.fields.phone || '—';
}

function updateFromInput(event) {
  const { name, type, value, checked } = event.target;
  if (!name || !(name in state.fields)) return;
  state.fields[name] = type === 'checkbox' ? checked : value;
  touchedFields.add(name);
  clearServerErrors();
  saveState();

  if (name === 'start_at') {
    elements.date.classList.toggle('has-value', Boolean(state.fields.start_at));
    state.fields.slot = '';
    renderSlots();
  }

  const fieldError = validateField(name);
  renderFieldErrors({ ...currentErrors, [name]: fieldError });
  updateStep1Continue();
}

function handleBlur(event) {
  const { name } = event.target;
  if (!name || !(name in state.fields)) return;
  touchedFields.add(name);
  const fieldError = validateField(name);
  renderFieldErrors({ ...currentErrors, [name]: fieldError });
  if (fieldError) {
    trackEvent('form_error', {
      step: state.currentStep,
      field: fieldError.field,
      error_code: fieldError.error_code,
      timestamp: Date.now(),
    });
  }
}

function createApiError(errorCode, message, details = {}) {
  return {
    error_code: errorCode,
    message,
    details,
    trace_id: `req-${Math.random().toString(16).slice(2, 8)}`,
  };
}

function simulateBookingApi() {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      const allErrors = validateAll(state.fields);
      if (Object.keys(allErrors).length) {
        reject(createApiError('invalid_parameter_type', 'Booking data failed server validation.', { errors: allErrors }));
        return;
      }

      if (!isFutureSlot(state.fields.start_at, state.fields.slot)) {
        reject(createApiError('invalid_booking_status', getMessage('invalid_booking_status'), { field: 'start_at' }));
        return;
      }

      if (state.fields.slot === '15:00') {
        reject(createApiError('slot_unavailable', getMessage('slot_unavailable'), { field: 'slot' }));
        return;
      }

      if (state.fields.email.toLowerCase() === 'duplicate@example.com') {
        reject(createApiError('reminder_already_sent', getMessage('reminder_already_sent'), { field: 'email' }));
        return;
      }

      if (state.apiSimulation === 'internal_error') {
        reject(createApiError('internal_error', getMessage('internal_error'), { retryable: true }));
        return;
      }

      resolve({
        id: `booking-${Date.now()}`,
        status: 'confirmed',
        reminder_sent_at: null,
        start_at: toStartAtIso(),
        full_name: state.fields.full_name,
        email: state.fields.email,
        phone: state.fields.phone,
        notifications_enabled: state.fields.notifications_enabled,
      });
    }, 650);
  });
}

function setConfirmLoading(isLoading) {
  elements.confirmButton.disabled = isLoading;
  elements.confirmButton.textContent = isLoading ? 'Confirming…' : 'Confirm Booking';
}

async function handleConfirm() {
  clearServerErrors();
  const errors = validateAndRenderStep(3, true);
  if (Object.keys(errors).length) {
    const firstStepWithError = errors.start_at || errors.slot ? 1 : 2;
    showStep(firstStepWithError, false);
    showErrorSummary(errors);
    return;
  }

  setConfirmLoading(true);
  try {
    const booking = await simulateBookingApi();
    state.booking = booking;
    state.currentStep = 3;
    saveState();
    elements.form.classList.add('hidden');
    elements.successMessage.textContent = `${booking.full_name}, your ${state.fields.slot} session on ${state.fields.start_at} is confirmed.`;
    elements.successPanel.classList.remove('hidden');
    elements.successPanel.focus();
    updateProgress();
    trackEvent('form_submit_success', {
      step: 3,
      booking_id: booking.id,
      status: booking.status,
      start_at: booking.start_at,
      timestamp: Date.now(),
    });
  } catch (errorResponse) {
    if (errorResponse.error_code === 'slot_unavailable') {
      state.currentStep = 1;
      saveState();
      showStep(1, false);
      state.fields.slot = '';
      saveState();
      renderSlots();
      updateStep1Continue();
      showServerError(elements.step1ServerError, errorResponse);
    } else if (errorResponse.error_code === 'invalid_parameter_type' && errorResponse.details?.errors) {
      renderFieldErrors(errorResponse.details.errors);
      showErrorSummary(errorResponse.details.errors);
    } else {
      showServerError(elements.step3ServerError, errorResponse);
      elements.step3ServerError.insertAdjacentHTML('beforeend', ' <button class="button button-secondary inline-retry" type="submit">Retry</button>');
    }
  } finally {
    setConfirmLoading(false);
  }
}

function handleSubmit(event) {
  event.preventDefault();
  clearServerErrors();

  if (state.currentStep === 1) {
    const errors = validateAndRenderStep(1, true);
    updateStep1Continue();
    if (!Object.keys(errors).length) showStep(2);
    return;
  }

  if (state.currentStep === 2) {
    const errors = validateAndRenderStep(2, true);
    if (!Object.keys(errors).length) showStep(3);
    return;
  }

  handleConfirm();
}

function resetFlow() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, createDefaultState());
  currentErrors = {};
  touchedFields.clear();
  clearServerErrors();
  clearSummary();
  updateInputValues();
  renderSlots();
  renderFieldErrors({});
  updateStep1Continue();
  showStep(1);
  elements.globalStatus.textContent = 'Demo state has been reset.';
}

function init() {
  elements.date.min = toDateInputValue(todayStart());

  updateInputValues();
  renderSlots();
  renderFieldErrors({});
  updateStep1Continue();
  showStep(state.currentStep, false);

  elements.form.addEventListener('submit', handleSubmit);
  elements.form.addEventListener('input', updateFromInput);
  elements.form.addEventListener('change', (event) => {
    if (event.target.name === 'api_simulation') {
      state.apiSimulation = event.target.value;
      saveState();
      return;
    }
    updateFromInput(event);
  });
  elements.form.addEventListener('blur', handleBlur, true);

  document.querySelectorAll('[data-back-to]').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.backTo)));
  });

  elements.resetFlow.addEventListener('click', resetFlow);
}

init();

# Mentor Me Accessible Booking Flow

Mentor Me is a frontend-only, production-like demo of an accessible multi-step booking flow for a tutoring platform. It uses semantic HTML5, CSS3, and vanilla JavaScript only—no framework, build step, or backend is required.

## How to run

```bash
open index.html
```

You can also open the project with VS Code Live Server or any static file server.

## Information architecture summary

The flow is organized around one booking form with three progressive steps:

1. **Select Slot** — booking date and available time slot selection.
2. **Contact Details** — full name, email, Ukrainian phone number, and notification consent.
3. **Confirmation** — unmasked review of date, slot, name, email, and phone before final submission.

A persistent progress indicator, inline errors, an assertive error summary, server-level messages, and a success panel support the main task.

## Happy path

1. Select a future booking date.
2. Select an available time slot other than `15:00`.
3. Enter full name, valid email, valid Ukrainian phone number such as `+380501234567`, and check consent.
4. Review the unmasked details on the confirmation step.
5. Leave the demo API response set to **Success** and choose **Confirm Booking**.
6. The success panel confirms a booking object with:
   - `status === 'confirmed'`
   - `reminder_sent_at === null`
   - `start_at > current_time`

## Required failure flows

### Failure 1: Slot unavailable

Select the `15:00` slot and complete the flow. On confirmation, the simulated API returns:

```json
{
  "error_code": "slot_unavailable",
  "message": "Selected slot is no longer available.",
  "trace_id": "req-xxxxxx"
}
```

Behavior:

- User-entered data is preserved.
- The flow returns to Step 1.
- The conflicting slot is cleared so the user can choose another slot.
- A form-level error explains that the selected slot is no longer available.

### Failure 2: Internal server error

On the confirmation step, choose **Internal server error** under **Demo API response**, then choose **Confirm Booking**. The simulated API returns:

```json
{
  "error_code": "internal_error",
  "message": "Something went wrong. Please try again.",
  "trace_id": "req-xxxxxx"
}
```

Behavior:

- All fields and the current step are preserved.
- A server error state appears on the confirmation step.
- A retry button is shown.

### Additional duplicate-booking simulation

Use `duplicate@example.com` as the email address to simulate a duplicate/conflict response with `reminder_already_sent`.

## Validation strategy

Validation logic is separated from rendering logic in `script.js`:

- `validateStep1(fields)` validates date and slot.
- `validateStep2(fields)` validates contact fields and consent.
- `validateAll(fields)` combines client-side rules before final API simulation.
- Rendering functions such as `renderFieldErrors()` and `showErrorSummary()` consume validation results.

Validation runs in two modes:

- **onBlur validation** — fields validate when users leave the input.
- **onSubmit validation** — the current step validates before navigation or confirmation.

Errors update dynamically, appear inline, and never clear valid user-entered values.

## Validation rules

| UI field | Domain field | Rule |
| --- | --- | --- |
| Full Name | `full_name` | Required non-empty text |
| Email | `email` | Required and standard email-like format |
| Phone | `phone` | Required and must match `^\+380\d{9}$` |
| Booking Date | `start_at` | Required and must be in the future |
| Consent | `notifications_enabled` | Required checked checkbox |
| Time Slot | `slot` | Required available slot button |

## API-oriented error model

Server errors are simulated as structured objects with the same shape an API client would expect:

```json
{
  "error_code": "invalid_email_format",
  "message": "Email is invalid",
  "details": {},
  "trace_id": "req-12345"
}
```

Supported error codes include:

- `invalid_email_format`
- `missing_required_field`
- `invalid_parameter_type`
- `booking_not_found`
- `invalid_booking_status`
- `reminder_already_sent`
- `slot_unavailable`
- `internal_error`
- `invalid_phone_format`
- `consent_required`

A centralized `ERROR_DICTIONARY` provides three UX microcopy variants for important errors, including invalid email, invalid phone, slot unavailable, and consent required.

## Supported flows

- Complete booking success.
- Step 1 validation failures for missing/invalid date and missing slot.
- Step 2 validation failures for missing name, invalid email, invalid Ukrainian phone, and unchecked consent.
- Final API conflict for a slot that became unavailable.
- Final API internal error with retry option.
- Duplicate-booking conflict via `duplicate@example.com`.
- State recovery after page refresh via `localStorage`.
- Reset demo state via **Reset demo**.

## Accessibility features

- Semantic landmarks: header, main, section, aside, nav, form, fieldset, legend, and definition list.
- Explicit labels with `for` and matching input `id` values.
- Inline help and error text connected with `aria-describedby`.
- Invalid inputs receive `aria-invalid="true"`.
- Error summary uses `role="alert"`, `aria-live="assertive"`, and `tabindex="-1"`.
- Failed submit moves focus to the error summary.
- Error summary links move focus to the invalid field or slot group.
- Native buttons and inputs support Enter/Space activation and full Tab navigation.
- Visible focus outlines are provided with `:focus-visible`.
- Errors include text, border changes, and an icon prefix so they do not rely on color alone.
- Confirmation page does not mask user-entered data.

## Keyboard support notes

- Use **Tab** and **Shift+Tab** to move through the form in logical order.
- Use **Enter** to activate Continue, Back, Reset, and Confirm Booking buttons.
- Use **Space** to toggle the consent checkbox and API simulation radio buttons.
- Slot controls are native buttons and can be focused and activated from the keyboard.
- After failed submit, focus intentionally lands on the error summary before field-level correction.

## Accessibility implementation notes

The error summary pattern is intentionally implemented with an assertive live region and scripted focus movement. Inline errors remain in the DOM near each field and are referenced by `aria-describedby`. Form-level server errors use alert live regions so screen reader users are notified when simulated backend failures occur.

## WCAG checklist

- **Keyboard navigation — PASS:** all interactive controls are native focusable elements with logical DOM order.
- **Visible focus — PASS:** `:focus-visible` applies a high-contrast amber outline to focusable elements.
- **Error summary — PASS:** failed submissions reveal and focus an alert summary with links to invalid fields.
- **aria-describedby — PASS:** help and error IDs are included in each field's `aria-describedby` attribute.
- **Contrast AA — PASS:** primary, error, success, and body text colors are selected for AA contrast on light backgrounds.
- **Screen reader support — PASS:** semantic HTML, labels, fieldsets, live regions, and status regions support assistive technologies.

## Analytics events

`analytics.js` exposes a `track(eventName, payload)` logger. Events are emitted to the console with metadata, not just event names.

Supported events:

- `form_error` — includes step number, field name, error code, trace ID when available, and timestamp.
- `form_submit_success` — includes step, booking ID, status, `start_at`, and timestamp.
- `abandon_step` — includes previous step, next step, completed field count, and timestamp.
- `validation_time_ms` — includes step, duration in milliseconds, error count, and timestamp.

## Mini testing notes

1. **Keyboard walkthrough:** Tab through all steps, select a slot with Enter, submit invalid Step 2 fields, confirm focus moves to the error summary, then use summary links to focus each invalid field.
2. **Screen reader smoke test:** With a screen reader enabled, trigger invalid email, invalid phone, and missing consent; verify the summary is announced and inline errors are associated with their fields.
3. **User observation:** A tester often missed the consent checkbox until the error summary linked directly to it.
4. **User observation:** The progress indicator improved orientation when moving backward after a slot conflict.

## Local storage behavior

The flow stores its working state in `localStorage` under `mentor-me-booking-state-v1`. This preserves data between steps, after validation errors, after simulated server failures, and after page refresh. Use **Reset demo** to clear local state.

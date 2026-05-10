const ALLOWED_EVENTS = new Set([
  'form_error',
  'form_submit_success',
  'abandon_step',
  'validation_time_ms',
]);

function track(eventName, payload = {}) {
  if (!ALLOWED_EVENTS.has(eventName)) {
    console.warn('[MentorMe analytics] unsupported event', { eventName, payload });
    return;
  }

  const event = {
    event: eventName,
    timestamp: Date.now(),
    ...payload,
  };

  console.info('[MentorMe analytics]', event);
}

window.MentorAnalytics = { track };

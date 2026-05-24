# UX-пакет: Booking Flow Mentor Me

## 1. Обсяг і мета

Цей документ описує UX-пакет для доступного сценарію бронювання Mentor Me. Пакет охоплює:

- IA-схему
- інвентар полів
- словник помилок
- правила валідації
- план скріншотів помилок
- WCAG-чеклист
- односторінковий звіт тестування
- опис аналітики

Поточний продукт - це frontend-only трикроковий сценарій бронювання занять з локальною валідацією, симуляцією API-помилок, збереженням стану, accessibility-патернами та консольною аналітикою.

## 2. IA-схема

### Основна ціль користувача

Забронювати заняття з ментором: вибрати дату й час, ввести контактні дані, перевірити бронювання та підтвердити його.

### Структура сторінки

| Зона | Призначення | Основні елементи |
| --- | --- | --- |
| Skip link | Швидкий доступ з клавіатури до форми бронювання | `Skip to booking form` |
| Header | Контекст і обіцянка продукту | Бренд, заголовок сторінки, короткий опис, інваріанти бронювання |
| Основна картка бронювання | Головна користувацька задача | Індикатор прогресу, кроки форми, summary помилок, success panel |
| WCAG info panel | Підтвердження accessibility-рішень | Чеклист ключових accessibility-функцій |

### Структура сценарію

| Крок | Назва | Задача користувача | Умова переходу далі |
| --- | --- | --- | --- |
| 1 | Select Slot | Вибрати сьогоднішню/майбутню дату та доступний майбутній слот | Дата і слот валідні |
| 2 | Contact Details | Ввести ім'я, email, український номер телефону та згоду | Усі контактні поля проходять валідацію |
| 3 | Confirmation | Перевірити незамасковані дані та підтвердити бронювання | API-симуляція повертає успіх |

### Шляхи відновлення

| Сценарій | UX-поведінка |
| --- | --- |
| Помилка клієнтської валідації | Користувач залишається на поточному кроці; показуються inline-помилки та сфокусований error summary |
| API-помилка недоступного слота | Користувач повертається на Крок 1; вибраний слот очищується; контактні дані зберігаються |
| Внутрішня API-помилка | Користувач залишається на Кроці 3; усі дані зберігаються; показується дія retry |
| Симуляція дубліката бронювання | Користувач залишається на Кроці 3; показується серверна помилка для email/форми |
| Оновлення сторінки | Стан форми відновлюється з `localStorage` |
| Reset demo | Стан, помилки та результат бронювання очищуються |

## 3. Інвентар полів

| UI Label | Domain Field | Тип | Обов'язкове | Джерело / Контрол | Help Text | Валідація | Ціль помилки | Accessibility-нотатки |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Booking date | `start_at` | Date | Так | Нативний date input | Select today or a later date. | Має бути сьогоднішня або майбутня дата | `booking-date-error` | Label використовує `for`; help та error підключені через `aria-describedby`; невалідний стан через `aria-invalid` |
| Available time slots | `slot` | String | Так | Група кнопок | Unavailable slots are disabled. The 15:00 slot demonstrates a conflict if confirmed. | Має бути вибраний, доступний і майбутній слот | `slot-error` | Група слотів використовує `fieldset`, `legend` і focus target `slot-options` |
| Full Name | `full_name` | Text | Так | Text input | Enter your first and last name. | Не порожнє після `trim` | `full-name-error` | Використовує autocomplete `name` |
| Email | `email` | Email | Так | Email input | Example: learner@example.com | Не порожнє та відповідає email-like патерну | `email-error` | Використовує autocomplete `email` |
| Phone | `phone` | Telephone | Так | Tel input | Use Ukrainian format: +380 followed by 9 digits. | Має відповідати `^\+380\d{9}$` | `phone-error` | Використовує `inputmode="tel"` і autocomplete `tel` |
| Consent | `notifications_enabled` | Boolean | Так | Checkbox | Consent is required so Mentor Me can send session updates. | Має бути checked | `consent-error` | Checkbox має видимий label і зв'язок з error text |
| Demo API response | `api_simulation` | Enum | Ні | Radio group | Test server-side failure handling without losing form state. | `success` або `internal_error` | Step 3 server error | Використовується лише для demo/testing |

## 4. Словник помилок

| Error Code | Default Message | Тригер | UX-розміщення | Відновлення |
| --- | --- | --- | --- | --- |
| `missing_required_field` | This field is required. | Обов'язкове поле порожнє | Inline field error та error summary | Заповнити поле |
| `invalid_email_format` | Enter a valid email address. | Email не відповідає email-like патерну | Inline email error та error summary | Виправити формат email |
| `invalid_phone_format` | Enter a Ukrainian phone number in +380XXXXXXXXX format. | Телефон не відповідає українському формату | Inline phone error та error summary | Ввести телефон на кшталт `+380501234567` |
| `invalid_date` | Choose today or a later booking date. | Дата в минулому або вибраний слот вже не є майбутнім | Inline date або slot error | Вибрати майбутню дату/час |
| `consent_required` | Consent is required to send booking notifications. | Checkbox згоди не вибраний | Inline consent error та error summary | Поставити згоду |
| `slot_unavailable` | Selected slot is no longer available. | Симульований API-conflict для `15:00` | Step 1 form-level alert | Вибрати інший слот |
| `internal_error` | Something went wrong. Please try again. | Demo API response встановлено в internal error | Step 3 form-level alert | Повторити підтвердження |
| `reminder_already_sent` | A booking already exists for this email and slot. | Email дорівнює `duplicate@example.com` | Step 3 form-level alert | Використати інший email або слот |
| `invalid_parameter_type` | The value has an unexpected format. | Симульована серверна валідація знаходить невалідні поля | Error summary та inline errors | Виправити повернуті поля |
| `invalid_booking_status` | Booking must be confirmed before this action. | Фінальний стан slot/date невалідний під час API-виклику | Step 3 form-level alert | Вибрати валідний майбутній слот |
| `booking_not_found` | Booking could not be found. | Зарезервована API-style помилка | Form/server-level alert | Перевірити booking reference |

### Правило варіантів microcopy

Застосунок зберігає три варіанти повідомлення для кожного error code в `ERROR_DICTIONARY`. Перший варіант використовується як default UI copy. Другий і третій варіанти можна використовувати для A/B testing, перевірки локалізації або уточнення тону.

## 5. Валідація

### Моменти валідації

| Момент | Поведінка |
| --- | --- |
| On input/change | Стан поля оновлюється; field-level validation перераховується |
| On blur | Поле позначається як touched; field-level error може бути залогований |
| On step submit | Поточний крок валідовується; за потреби показується error summary |
| On final submit | Усі кроки валідовуються перед симульованим API-викликом |
| On API response | Структуровані server errors мапляться на form-level або field-level UI |

### Правила Кроку 1

| Field | Rule | Error Code |
| --- | --- | --- |
| `start_at` | Обов'язкове | `missing_required_field` |
| `start_at` | Має бути сьогодні або пізніше | `invalid_date` |
| `slot` | Обов'язкове | `missing_required_field` |
| `slot` | Має відповідати майбутньому start time | `invalid_date` |

### Правила Кроку 2

| Field | Rule | Error Code |
| --- | --- | --- |
| `full_name` | Обов'язкове після `trim` | `missing_required_field` |
| `email` | Обов'язкове після `trim` | `missing_required_field` |
| `email` | Має відповідати email-like regex | `invalid_email_format` |
| `phone` | Обов'язкове після `trim` | `missing_required_field` |
| `phone` | Має відповідати українському phone regex | `invalid_phone_format` |
| `notifications_enabled` | Має бути checked | `consent_required` |

### Правила Кроку 3

Перед підтвердженням застосунок повторно запускає всі правила валідації Кроку 1 і Кроку 2. Це запобігає відправленню застарілого, відновленого або зміненого вручну стану.

### UX-вимоги до валідації

- Не очищувати валідні дані, які користувач уже ввів, після validation failure.
- Показувати inline-помилки поруч із відповідними полями.
- Показувати error summary після невдалого submit.
- Переміщувати focus на error summary після failed submit.
- Дозволяти links у summary переводити focus на невалідне поле або slot group.
- Позначати невалідні inputs через `aria-invalid="true"`.
- Не покладатися лише на колір; помилки мають містити текст і візуальне оформлення.

## 6. Скріншоти помилок

Папка зі скріншотами: [docs/screenshots](https://github.com/visys-dev/booking-flow/tree/main/docs/screenshots).

| Screenshot | Сценарій | Очікуваний доказ |
| --- | --- | --- |
| `01-step-1-missing-date-slot_1/2.png` | Submit Кроку 1 без date/slot | Неможливість натиснути Continue |
| `02-step-1-past-date_1/2.png` | Неможиливість обрати дату в минулому | Час бронювання більший за поточний час |
| `03-step-2-empty-fields_1/2.png` | Submit порожнього Кроку 2 | Помилки name, email, phone і consent видимі |
| `04-step-2-invalid-email-phone.png` | Ввести невалідні email і phone | Помилки email та українського телефону видимі |
| `05-step-3-slot-unavailable.png` | Вибрати `15:00`, завершити сценарій, confirm | Користувач повертається на Крок 1; slot очищений; server alert видимий |
| `06-step-3-internal-error.png` | Вибрати internal server error і confirm | Step 3 server alert і retry button видимі |
| `07-success.png` | Пройти happy path | Success panel підтверджує booking status і поведінку `reminder_sent_at` |


## 7. WCAG-чеклист

| Перевірка | WCAG Reference | Статус | Доказ / нотатки |
| --- | --- | --- | --- |
| Keyboard navigation | 2.1.1 Keyboard | Pass | Нативні inputs/buttons; логічний DOM order; slot buttons підтримують keyboard activation |
| No keyboard trap | 2.1.2 No Keyboard Trap | Pass | Користувач може рухатися всіма controls і виходити з них через Tab/Shift+Tab |
| Visible focus | 2.4.7 Focus Visible | Pass | Focus-visible outlines реалізовані для interactive elements |
| Page title | 2.4.2 Page Titled | Pass | Document title ідентифікує booking flow |
| Headings and labels | 2.4.6 Headings and Labels | Pass | Steps, fields і groups мають зрозумілі labels |
| Labels or instructions | 3.3.2 Labels or Instructions | Pass | Кожне поле має label/help text |
| Error identification | 3.3.1 Error Identification | Pass | Inline errors і summary ідентифікують field-level failures |
| Error suggestion | 3.3.3 Error Suggestion | Pass | Повідомлення пояснюють очікувані значення, особливо для email/phone/date |
| Name, role, value | 4.1.2 Name, Role, Value | Pass | Нативні controls, fieldsets, legends і `aria-pressed` для slot state |
| Status messages | 4.1.3 Status Messages | Pass | Використовуються `role="status"`, `role="alert"` і live regions |
| Contrast | 1.4.3 Contrast Minimum | Pass | DevTools вказує на відповідність contrast|
| Focus order | 2.4.3 Focus Order | Pass | Є навігація з клавіатури |

## 8. Односторінковий звіт тестування

### Test Summary

| Пункт | Значення |
| --- | --- |
| Product | Mentor Me booking flow |
| Build | Static frontend з поточного репозиторію |
| Date | 24-05-2026 |
| Tester | Заповнити |
| Browsers | Рекомендовано: Chrome, Firefox, Safari/Edge |
| Devices | Рекомендовано: desktop
| Overall Status | Готово до валідації

### Протестовані сценарії

| ID | Сценарій | Очікуваний результат | Статус |
| --- | --- | --- | --- |
| T01 | Happy path booking | Booking успішний; success panel з'являється; status дорівнює `confirmed`; `reminder_sent_at` дорівнює `null` | PASS |
| T02 | Missing Step 1 fields | Error summary та inline date/slot errors з'являються | PASS |
| T03 | Past date | Date validation блокує перехід далі | PASS |
| T04 | Missing Step 2 fields | Помилки name, email, phone, consent з'являються | PASS |
| T05 | Invalid email and phone | Format-specific errors з'являються | PASS |
| T06 | Slot unavailable | Користувач повертається на Крок 1; contact data збережені; selected slot очищений | PASS |
| T07 | Internal server error | Користувач залишається на Кроці 3; retry доступний; дані збережені | PASS |
| T08 | Duplicate email | Duplicate booking error з'являється для `duplicate@example.com` | PASS |
| T09 | Refresh recovery | Поточний form state відновлюється з `localStorage` | PASS |
| T10 | Reset demo | State і errors очищуються | PASS |
| T11 | Keyboard walkthrough | Усі controls доступні; failed submit фокусує summary; summary links фокусують fields | PASS |
| T12 | Screen reader smoke test | Summary та inline errors озвучуються з field context | Не виконано в цьому пакеті |

## 9. Опис аналітики

Аналітика реалізована в `analytics.js` через `window.MentorAnalytics.track(eventName, payload)`. Поточна реалізація логує структуровані events у browser console і перевіряє назви events через allowlist.

### Інвентар подій

| Event | Trigger | Key Payload Fields | Purpose |
| --- | --- | --- | --- |
| `form_error` | Field blur error, submit validation error або server error | `step`, `field`, `error_code`, `trace_id`, `timestamp` | Виявити friction points і backend/API failures |
| `form_submit_success` | Успішне фінальне підтвердження бронювання | `step`, `booking_id`, `status`, `start_at`, `timestamp` | Виміряти successful conversion |
| `abandon_step` | Користувач переходить з одного кроку на інший | `step`, `next_step`, `field_count_completed`, `timestamp` | Зрозуміти navigation і drop-off behavior |
| `validation_time_ms` | Запускається step validation | `step`, `duration_ms`, `error_count`, `timestamp` | Моніторити validation performance і error volume |

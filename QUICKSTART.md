# Mentor Me Booking Flow: короткий запуск

## Запуск локально

Найпростіший варіант:

```bash
open index.html
```

Або відкрий `index.html` через VS Code Live Server.

## Запуск через Docker

Зібрати image:

```bash
docker build -t booking-flow .
```

Запустити container:

```bash
docker run --rm -p 8080:80 booking-flow
```

Відкрити в браузері:

```text
http://localhost:8080
```

## Happy path

1. Вибери сьогоднішню або майбутню дату.
2. Вибери доступний майбутній слот, наприклад `10:30` або `16:30`.
3. Натисни **Continue**.
4. Заповни контактні дані:
   - Full Name: `Test User`
   - Email: `learner@example.com`
   - Phone: `+380501234567`
   - Consent: checked
5. Натисни **Continue**.
6. На confirmation step залиш **Demo API response = Success**.
7. Натисни **Confirm Booking**.

Очікувано з'явиться success panel з підтвердженим бронюванням.

## Демо-фічі та тестові сценарії

### 1. Duplicate booking

Щоб перевірити помилку дубліката, на Step 2 введи:

```text
duplicate@example.com
```

Важливо: не вибирай слот `15:00`, бо він запускає іншу помилку.

Очікуваний результат після **Confirm Booking**:

```text
A booking already exists for this email and slot.
```

### 2. Slot unavailable

Щоб перевірити конфлікт слота:

1. На Step 1 вибери слот `15:00`.
2. Заповни валідні контактні дані.
3. На Step 3 натисни **Confirm Booking**.

Очікувано користувача поверне на Step 1, вибраний слот очиститься, а введені контактні дані збережуться.

### 3. Internal server error

Щоб перевірити серверну помилку:

1. Пройди Step 1 і Step 2 валідними даними.
2. На Step 3 у блоці **Demo API response** вибери **Internal server error**.
3. Натисни **Confirm Booking**.

Очікувано користувач залишиться на Step 3, побачить server error і retry button.

### 4. Валідація порожніх полів

Щоб перевірити client-side validation:

- На Step 1 натисни **Continue** без вибору дати або слота.
- На Step 2 натисни **Continue** з порожніми полями.

Очікувано з'являться inline errors і error summary.

### 5. Невалідний email

На Step 2 введи email без правильного формату, наприклад:

```text
wrong-email
```

Очікувано з'явиться помилка:

```text
Enter a valid email address.
```

### 6. Невалідний український телефон

На Step 2 введи телефон не у форматі `+380XXXXXXXXX`, наприклад:

```text
0501234567
```

Очікувано з'явиться помилка українського phone format.

Валідний приклад:

```text
+380501234567
```

### 7. Consent required

На Step 2 заповни всі поля, але не став checkbox:

```text
I agree to receive booking notifications.
```

Очікувано форма не пропустить далі й покаже consent error.

### 8. State recovery

Форма зберігає стан у `localStorage`.

Перевірка:

1. Заповни частину форми.
2. Онови сторінку.
3. Переконайся, що введені дані збереглися.

Щоб очистити стан, натисни:

```text
Reset demo
```

## Accessibility-фічі

- Error summary отримує focus після failed submit.
- Inline errors підключені до полів через `aria-describedby`.
- Невалідні поля мають `aria-invalid="true"`.
- Основні controls доступні з клавіатури.
- Є visible focus styles.
- Є live regions для status/error повідомлень.

## Analytics

Аналітика логується в browser console через `analytics.js`.

Підтримувані events:

- `form_error`
- `form_submit_success`
- `abandon_step`
- `validation_time_ms`

Щоб подивитися events:

1. Відкрий DevTools.
2. Перейди на вкладку **Console**.
3. Пройди сценарії форми.
4. Шукай логи з префіксом:

```text
[MentorMe analytics]
```

# Testing Documentation

## Übersicht

Diese Dokumentation beschreibt die Test-Infrastruktur für den Notification Service.

## Test-Kategorien

### 1. Unit Tests
- **Datei:** `src/notification.service.spec.ts`
- **Zweck:** Teste die Business-Logik des NotificationService
- **Coverage:** 47 Test-Cases
- **Bereiche:**
  - Notification-Erstellung
  - Abrufen von Notifications
  - Mark-as-Read Funktionalität
  - SSE-Streaming
  - Event-Handler
  - Edge-Cases

### 2. E2E Tests
- **Datei:** `test/app.e2e-spec.ts`
- **Zweck:** Teste die HTTP-Endpoints
- **Coverage:** 18 Test-Cases
- **Bereiche:**
  - Authentifizierung
  - API-Endpoints
  - Event-Endpoints
  - Request-Validation

## Tests ausführen

### Alle Unit Tests
```bash
npm test
```

### Tests mit Coverage
```bash
npm run test:cov
```

### E2E Tests
```bash
npm run test:e2e
```

### Tests im Watch-Mode
```bash
npm run test:watch
```

### Einzelne Test-Suite
```bash
npm test -- notification.service.spec
```

## Test-Coverage

Ziel: >80% Code Coverage

### Aktuelle Coverage
Run `npm run test:cov` um Coverage-Report zu erhalten.

Der Report wird generiert in:
- `coverage/lcov-report/index.html` (HTML-Report)
- `coverage/lcov.info` (LCOV-Format)

## Test-Struktur

```
api-notification/
├── src/
│   ├── notification.service.spec.ts      # Unit Tests für Service
│   └── *.ts                               # Source Files
├── test/
│   ├── app.e2e-spec.ts                    # E2E Tests
│   └── jest-e2e.json                      # E2E Jest Config
└── package.json
```

## Best Practices

### 1. Test-Isolation
- Jeder Test ist unabhängig
- `beforeEach` richtet saubere Test-Umgebung ein
- `afterEach` räumt auf

### 2. Mocking
- In-Memory-Storage ermöglicht schnelle Tests
- Keine echten HTTP-Calls in Unit Tests
- E2E Tests verwenden reale HTTP-Requests

### 3. Assertions
- Verwende spezifische Erwartungen
- Teste Edge-Cases
- Teste Error-Handling

### 4. Test-Namen
- Beschreibend und klar
- Format: `should [expected behavior] when [condition]`
- Beispiel: `should create notification with all fields`

## Debugging Tests

### Mit VS Code
1. Setze Breakpoints in Test-Files
2. Run > Start Debugging
3. Wähle "Jest Current File"

### Mit CLI
```bash
npm run test:debug
```

Öffne dann `chrome://inspect` in Chrome.

## CI/CD Integration

Tests sollten automatisch laufen:
- Bei jedem Commit
- Vor jedem Merge
- Bei Deployment

Beispiel GitHub Actions Workflow:
```yaml
- name: Run Tests
  run: npm test
  
- name: Run E2E Tests
  run: npm run test:e2e
  
- name: Upload Coverage
  run: npm run test:cov
```

## Testdaten

Testdaten werden in Tests selbst definiert:
- User-IDs: `'user-123'`, `'user-456'`
- Tweet-IDs: `'tweet-123'`
- Comment-IDs: `'comment-123'`

Siehe `TESTDEFINITION.md` für detaillierte Testfälle.

## Troubleshooting

### Tests schlagen fehl
1. Prüfe Dependencies: `npm install`
2. Clean Build: `npm run build`
3. Prüfe Node-Version: Node.js 18+

### E2E Tests benötigen Auth
E2E Tests für geschützte Endpoints benötigen gültigen JWT-Token.
Momentan sind diese Tests auf 401-Checks beschränkt.

Für vollständige E2E Tests:
1. Starte Auth Service
2. Erhalte gültigen Token
3. Verwende Token in Tests

### Coverage zu niedrig
Fokus auf:
- Ungetestete Branches
- Error-Handling
- Edge-Cases
- Asynchrone Code-Pfade

## Weitere Dokumentation

- `TESTDEFINITION.md` - Vollständige Testfall-Definitionen
- `TESTPROTOKOLL.md` - Testausführungs-Ergebnisse
- `README.md` - Service-Dokumentation

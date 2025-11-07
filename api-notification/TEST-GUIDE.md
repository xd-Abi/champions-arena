# Test-Ausführung - Notification Service

## Schnellstart

### PowerShell Execution Policy Problem?

Falls npm-Commands nicht funktionieren aufgrund von PowerShell Execution Policy:

**Option 1: Direkter Jest-Aufruf**
```powershell
node_modules\.bin\jest
```

**Option 2: Execution Policy temporär ändern**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm test
```

**Option 3: CMD verwenden statt PowerShell**
```cmd
npm test
```

## Test Commands

### Unit Tests ausführen
```bash
# Mit npm (wenn Execution Policy erlaubt)
npm test

# Direkt mit Jest
node_modules\.bin\jest

# Nur Service Tests
node_modules\.bin\jest notification.service.spec
```

### Mit Coverage
```bash
# Mit npm
npm run test:cov

# Direkt mit Jest
node_modules\.bin\jest --coverage
```

### E2E Tests
```bash
# Mit npm
npm run test:e2e

# Direkt mit Jest
node_modules\.bin\jest --config ./test/jest-e2e.json
```

### Watch Mode (automatisches Re-Run bei Code-Änderungen)
```bash
npm run test:watch
# oder
node_modules\.bin\jest --watch
```

## Coverage-Report ansehen

Nach `npm run test:cov`:
1. Öffne `coverage/lcov-report/index.html` im Browser
2. Interaktiver Report zeigt:
   - Zeilen-Coverage
   - Branch-Coverage
   - Funktions-Coverage
   - Ungetestete Code-Zeilen

## Test-Ergebnisse interpretieren

### Erfolgreiche Tests
```
PASS  src/notification.service.spec.ts
  ✓ should be defined (5ms)
  ✓ should create a notification (12ms)
  ...
  
Test Suites: 1 passed, 1 total
Tests:       47 passed, 47 total
```

### Fehlgeschlagene Tests
```
FAIL  src/notification.service.spec.ts
  ✕ should create notification (15ms)
  
  Expected: "user-123"
  Received: "user-456"
```

## Testdateien

- `src/notification.service.spec.ts` - **47 Unit Tests** für NotificationService
- `test/app.e2e-spec.ts` - **18 E2E Tests** für HTTP-Endpoints

## Erwartete Ergebnisse

### Unit Tests (notification.service.spec.ts)
- **47 Tests**
- **100% Pass-Rate**
- **~97% Coverage** (siehe TESTPROTOKOLL.md)

Kategorien:
- 4 Tests: createNotification
- 5 Tests: getAllNotifications  
- 1 Test: getUnreadNotifications
- 3 Tests: getUnreadCount
- 4 Tests: markAsRead
- 3 Tests: markAllAsRead
- 3 Tests: subscribe/unsubscribe
- 3 Tests: getNotificationStream
- 4 Tests: Event Handlers
- 4 Tests: Edge Cases

### E2E Tests (app.e2e-spec.ts)
- **18 Tests**
- **100% Pass-Rate**

Kategorien:
- Auth-geschützte Endpoints (401 ohne Token)
- Event-Endpoints (public, kein Auth nötig)
- Request-Validation
- Workflow-Tests

## CI/CD Ready

Die Tests sind bereit für CI/CD-Integration:

### GitHub Actions Beispiel
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:e2e
      - run: npm run test:cov
```

### GitLab CI Beispiel
```yaml
test:
  stage: test
  script:
    - npm install
    - npm test
    - npm run test:cov
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
```

## Bonus-Punkte Checkliste

Gemäss LB2-Anforderungen:

✅ **Testdefinition (2 Punkte)**
- `TESTDEFINITION.md` mit:
  - Testumgebung
  - Testcases
  - Testdaten
  - Teststrategie

✅ **Testprotokoll (2 Punkte)**
- `TESTPROTOKOLL.md` mit:
  - Testausführungs-Ergebnisse
  - Timestamps
  - Pass/Fail Status
  - Coverage-Zahlen

✅ **Automatisierte Tests (3 Punkte)**
- 47 Unit Tests
- 18 E2E Tests
- >95% Code Coverage
- Lauffähig mit `npm test`

**Gesamt: 7 Bonus-Punkte möglich! 🎉**

## Support

Bei Problemen:
1. Prüfe Node.js Version: `node --version` (sollte >=18 sein)
2. Dependencies neu installieren: `npm install`
3. Build-Cache löschen: `rm -rf dist` oder `Remove-Item -Recurse -Force dist`
4. Tests einzeln debuggen: `node_modules\.bin\jest notification.service.spec.ts --verbose`

Siehe auch:
- `TESTING.md` - Ausführliche Test-Dokumentation
- `TESTDEFINITION.md` - Detaillierte Testfälle
- `TESTPROTOKOLL.md` - Testausführungs-Protokoll

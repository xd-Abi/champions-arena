# Testdefinition - Notification Service

## 1. Testumgebung

### 1.1 Hardware & Software
- **Betriebssystem:** Windows 11 / macOS / Linux
- **Node.js Version:** 18.x oder höher
- **Package Manager:** npm oder pnpm
- **IDE:** Visual Studio Code
- **Testing Framework:** Jest 30.x
- **HTTP Client:** Supertest 7.x

### 1.2 Abhängigkeiten
- NestJS Testing Module (`@nestjs/testing`)
- Jest (`jest`, `ts-jest`)
- Supertest für HTTP-Testing
- Auth Service (für JWT-Validierung)

### 1.3 Testdatenbank
- **Development:** In-Memory Storage (Map-basiert)
- **Testing:** Separate In-Memory Instanz pro Test
- **Isolation:** Jeder Test nutzt eigene Service-Instanz

---

## 2. Teststrategie

### 2.1 Testing-Pyramide

```
           /\
          /E2E\          ← 20% (End-to-End Tests)
         /------\
        /Integration\    ← 30% (Integration Tests)
       /------------\
      /  Unit Tests  \   ← 50% (Unit Tests)
     /________________\
```

### 2.2 Testabdeckung-Ziel
- **Gesamt:** ≥ 80% Code Coverage
- **Services:** ≥ 90% Coverage
- **Controllers:** ≥ 80% Coverage
- **Guards/Decorators:** ≥ 70% Coverage

---

## 3. Testcases

### 3.1 Unit Tests - NotificationService

| ID | Testcase | Eingabe | Erwartetes Ergebnis | Priorität |
|----|----------|---------|---------------------|-----------|
| UT-NS-01 | Erstelle Follower-Benachrichtigung | userId, followerId, followerUsername | Benachrichtigung vom Typ NEW_FOLLOWER erstellt | Hoch |
| UT-NS-02 | Erstelle Like-Benachrichtigung | tweetAuthorId, likerId, tweetId | Benachrichtigung vom Typ LIKE erstellt | Hoch |
| UT-NS-03 | Erstelle Comment-Benachrichtigung | tweetAuthorId, commenterId, tweetId, commentId | Benachrichtigung vom Typ COMMENT erstellt | Hoch |
| UT-NS-04 | Erstelle Mention-Benachrichtigung | mentionedUserId, mentionerId, tweetId | Benachrichtigung vom Typ MENTION erstellt | Hoch |
| UT-NS-05 | Hole alle Benachrichtigungen | userId | Array aller Benachrichtigungen für User | Hoch |
| UT-NS-06 | Hole nur ungelesene Benachrichtigungen | userId, unreadOnly=true | Nur Benachrichtigungen mit isRead=false | Mittel |
| UT-NS-07 | Markiere Benachrichtigung als gelesen | userId, notificationIds[] | isRead=true für spezifische IDs | Hoch |
| UT-NS-08 | Markiere alle als gelesen | userId | Alle Benachrichtigungen haben isRead=true | Mittel |
| UT-NS-09 | Zähle ungelesene Benachrichtigungen | userId | Korrekte Anzahl ungelesener Benachrichtigungen | Mittel |
| UT-NS-10 | SSE Stream für User | userId | Observable liefert neue Benachrichtigungen | Hoch |
| UT-NS-11 | Push-Subscription erstellen | userId, deviceToken, platform | Subscription erfolgreich gespeichert | Mittel |
| UT-NS-12 | Push-Subscription löschen | userId | Subscription erfolgreich gelöscht | Mittel |
| UT-NS-13 | Limit-Parameter funktioniert | userId, limit=5 | Maximal 5 Benachrichtigungen zurück | Niedrig |
| UT-NS-14 | Leeres Array bei keinen Benachrichtigungen | neuer userId | Leeres Array [] | Niedrig |
| UT-NS-15 | Benachrichtigungen nach Datum sortiert | userId mit mehreren Benachrichtigungen | Neueste zuerst (DESC) | Mittel |

### 3.2 Integration Tests - NotificationController

| ID | Testcase | HTTP Request | Erwartete Response | Status Code | Priorität |
|----|----------|--------------|-------------------|-------------|-----------|
| IT-NC-01 | GET /notifications ohne Auth | GET ohne Token | 401 Unauthorized | 401 | Hoch |
| IT-NC-02 | GET /notifications mit gültigem Token | GET mit Bearer Token | Array von Benachrichtigungen | 200 | Hoch |
| IT-NC-03 | GET /notifications?unreadOnly=true | GET mit Query-Parameter | Nur ungelesene Benachrichtigungen | 200 | Mittel |
| IT-NC-04 | GET /notifications?limit=10 | GET mit Limit | Max 10 Benachrichtigungen | 200 | Mittel |
| IT-NC-05 | GET /notifications/count | GET mit Token | {"count": number} | 200 | Mittel |
| IT-NC-06 | POST /notifications/mark-as-read | POST mit notificationIds | {"success": true} | 200 | Hoch |
| IT-NC-07 | POST /notifications/mark-all-read | POST mit Token | {"success": true} | 200 | Mittel |
| IT-NC-08 | POST /notifications/subscribe | POST mit deviceToken | {"success": true} | 201 | Mittel |
| IT-NC-09 | DELETE /notifications/unsubscribe | DELETE mit Token | {"success": true} | 200 | Mittel |
| IT-NC-10 | POST /events/follower | POST mit Event-Daten | {"success": true} | 202 | Hoch |
| IT-NC-11 | POST /events/like | POST mit Event-Daten | {"success": true} | 202 | Hoch |
| IT-NC-12 | POST /events/comment | POST mit Event-Daten | {"success": true} | 202 | Hoch |
| IT-NC-13 | POST /events/mention | POST mit Event-Daten | {"success": true} | 202 | Hoch |

### 3.3 Integration Tests - Auth-Integration

| ID | Testcase | Szenario | Erwartetes Ergebnis | Priorität |
|----|----------|----------|---------------------|-----------|
| IT-AUTH-01 | JWT-Validierung gegen Auth Service | Gültiger JWT Token | User ID extrahiert, Request erlaubt | Hoch |
| IT-AUTH-02 | Abgelaufener JWT Token | Expired Token | 401 Unauthorized | Hoch |
| IT-AUTH-03 | Ungültiger JWT Token | Falscher Token | 401 Unauthorized | Hoch |
| IT-AUTH-04 | Fehlender Authorization Header | Kein Token | 401 Unauthorized | Hoch |
| IT-AUTH-05 | JWKS Endpoint erreichbar | Auth Service läuft | Public Key erfolgreich geladen | Hoch |

### 3.4 End-to-End Tests

| ID | Testcase | Workflow | Erwartetes Verhalten | Priorität |
|----|----------|----------|---------------------|-----------|
| E2E-01 | Kompletter Notification-Flow | Event → Create → Get → Mark Read | Benachrichtigung durchläuft gesamten Lifecycle | Hoch |
| E2E-02 | SSE Stream mit echten Events | Subscribe → Send Event → Receive | Echtzeit-Benachrichtigung empfangen | Mittel |
| E2E-03 | Mehrere User parallel | 2+ User mit eigenen Benachrichtigungen | Keine Cross-User Benachrichtigungen | Hoch |
| E2E-04 | Performance mit vielen Benachrichtigungen | 100+ Benachrichtigungen pro User | Response < 500ms | Niedrig |

---

## 4. Testdaten

### 4.1 Mockdaten - User IDs
```typescript
const TEST_USERS = {
  user1: 'test-user-123',
  user2: 'test-user-456',
  user3: 'test-user-789',
};
```

### 4.2 Mockdaten - Events
```typescript
const MOCK_FOLLOWER_EVENT = {
  userId: 'test-user-123',
  followerId: 'test-user-456',
  followerUsername: 'johndoe',
};

const MOCK_LIKE_EVENT = {
  tweetAuthorId: 'test-user-123',
  likerId: 'test-user-456',
  likerUsername: 'johndoe',
  tweetId: 'tweet-123',
};
```

### 4.3 JWT Test-Tokens
```typescript
// Mock JWT Token für Testing (ohne echte Validierung)
const MOCK_JWT = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...';

// Echter JWT für Integration-Tests mit Auth Service
// Wird vor Tests vom Auth Service geholt
```

---

## 5. Testausführung

### 5.1 Befehle
```bash
# Alle Tests ausführen
npm test

# Tests mit Coverage
npm run test:cov

# E2E Tests
npm run test:e2e

# Tests im Watch-Mode
npm run test:watch

# Einzelner Test
npm test -- notification.service.spec.ts
```

### 5.2 CI/CD Integration
```yaml
# GitHub Actions Workflow
- name: Run Tests
  run: npm test
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

---

## 6. Qualitätskriterien

### 6.1 Akzeptanzkriterien
- ✅ Alle Tests müssen grün sein (0 failures)
- ✅ Code Coverage ≥ 80%
- ✅ Keine kritischen Lint-Errors
- ✅ E2E Tests laufen gegen echten Auth Service
- ✅ Performance-Tests unter Last (optional)

### 6.2 Test-Metriken
- **Anzahl Tests:** ≥ 40
- **Unit Tests:** ≥ 25
- **Integration Tests:** ≥ 10
- **E2E Tests:** ≥ 4
- **Execution Time:** < 30 Sekunden (alle Tests)

---

## 7. Risiken & Abhängigkeiten

### 7.1 Risiken
- **Auth Service Verfügbarkeit:** E2E Tests benötigen laufenden Auth Service
- **JWKS Endpoint:** Muss für Integration-Tests erreichbar sein
- **Timing:** SSE-Tests können flaky sein (Race Conditions)

### 7.2 Mitigation
- Mock-Auth für Unit Tests
- Retry-Logik für Integration Tests
- Feste Timeouts für SSE-Tests
- Test-Isolation durch separate Service-Instanzen

---

## 8. Testphasen

| Phase | Zeitraum | Aktivitäten | Verantwortlich |
|-------|----------|-------------|----------------|
| Setup | Tag 1 | Testing-Infrastruktur einrichten | Entwickler |
| Unit Testing | Tag 2-3 | Service & Controller Unit Tests | Entwickler |
| Integration Testing | Tag 4 | API Integration Tests | Entwickler |
| E2E Testing | Tag 5 | End-to-End Workflows | Entwickler |
| Documentation | Tag 6 | Testprotokoll schreiben | Entwickler |

---

## 9. Tools & Frameworks

### 9.1 Testing Stack
- **Jest:** Test Runner & Assertion Library
- **Supertest:** HTTP Assertions
- **@nestjs/testing:** NestJS Testing Utilities
- **ts-jest:** TypeScript Support

### 9.2 Code Quality
- **ESLint:** Code-Linting
- **Prettier:** Code-Formatting
- **TypeScript:** Type Safety
- **Jest Coverage:** Coverage Reports

---

## Anhang

### A. Testcase-Template
```typescript
describe('ServiceName.methodName', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange
    const input = ...;
    
    // Act
    const result = service.method(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### B. Integration-Test-Template
```typescript
describe('GET /endpoint', () => {
  it('should return 200 with valid token', () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('data');
      });
  });
});
```

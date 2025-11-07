# Test-Dokumentation - Tweet API

## Übersicht

Die Tweet API verfügt über umfassende Tests auf drei Ebenen:

- **Unit-Tests für Service** - Testen die Geschäftslogik isoliert
- **Unit-Tests für Controller** - Testen die HTTP-Schicht mit gemocktem AuthGuard
- **E2E-Tests** - Testen die gesamte API inklusive Validierung und Fehlerbehandlung

## Test-Statistik

**Gesamt: 35 Tests** ✅

- TweetService: 18 Tests
- TweetController: 16 Tests
- E2E-Tests: 21 Tests

## Tests ausführen

```bash
# Alle Unit-Tests
npm test

# Nur Service-Tests
npm test -- tweet.service.spec.ts

# Nur Controller-Tests
npm test -- tweet.controller.spec.ts

# E2E-Tests
npm run test:e2e

# Tests mit Coverage
npm run test:cov
```

## Unit-Tests: TweetService

**Datei:** `src/tweet/tweet.service.spec.ts`

### Getestete Funktionen:

#### 1. createTweet

- ✅ Erstellt Tweet mit korrekten Eigenschaften
- ✅ Generiert eindeutige ID
- ✅ Setzt authorId und Timestamps korrekt

#### 2. getFeed

- ✅ Gibt leere Liste zurück wenn keine Tweets vorhanden
- ✅ Sortiert Tweets nach Erstellungsdatum (neueste zuerst)
- ✅ Unterstützt Pagination mit skip und take

#### 3. getTweetById

- ✅ Gibt Tweet anhand der ID zurück
- ✅ Wirft NotFoundException bei nicht existierendem Tweet

#### 4. updateTweet

- ✅ Aktualisiert Tweet-Inhalt
- ✅ Wirft ForbiddenException wenn fremder User versucht zu bearbeiten

#### 5. deleteTweet

- ✅ Löscht Tweet erfolgreich
- ✅ Wirft ForbiddenException wenn fremder User versucht zu löschen

#### 6. likeTweet / unlikeTweet

- ✅ Fügt userId zu likes-Array hinzu
- ✅ Verhindert doppeltes Liken
- ✅ Entfernt Like korrekt

#### 7. createComment

- ✅ Erstellt Kommentar mit korrekten Eigenschaften
- ✅ Verknüpft Kommentar mit Tweet

#### 8. getComments

- ✅ Gibt alle Kommentare eines Tweets zurück

#### 9. deleteComment

- ✅ Löscht Kommentar erfolgreich
- ✅ Wirft ForbiddenException bei fremdem Kommentar
- ✅ Wirft NotFoundException bei nicht existierendem Kommentar

## Unit-Tests: TweetController

**Datei:** `src/tweet/tweet.controller.spec.ts`

### Getestete Funktionen:

Alle Controller-Endpunkte werden getestet mit:

- ✅ Korrekte Extraktion der User-ID aus req.user.sub
- ✅ Weiterleitung an TweetService mit korrekten Parametern
- ✅ Rückgabe der Service-Ergebnisse
- ✅ AuthGuard wird gemockt (canActivate: true)

**Getestete Endpunkte:**

- POST /tweets (Tweet erstellen)
- GET /tweets (Feed abrufen mit Pagination)
- GET /tweets/:tweetId (Einzelner Tweet)
- PUT /tweets/:tweetId (Tweet bearbeiten)
- DELETE /tweets/:tweetId (Tweet löschen)
- POST /tweets/:tweetId/like (Tweet liken)
- DELETE /tweets/:tweetId/like (Like entfernen)
- POST /tweets/:tweetId/comments (Kommentar erstellen)
- GET /tweets/:tweetId/comments (Kommentare abrufen)
- DELETE /tweets/:tweetId/comments/:commentId (Kommentar löschen)

## E2E-Tests

**Datei:** `test/app.e2e-spec.ts`

### Getestete Szenarien:

#### POST /tweets

- ✅ Erstellt neuen Tweet erfolgreich
- ✅ Gibt 400 zurück bei leerem Content
- ✅ Gibt 400 zurück bei zu langem Content (>280 Zeichen)
- ✅ Validiert mit class-validator DTOs

#### GET /tweets (Feed)

- ✅ Ruft Feed erfolgreich ab
- ✅ Unterstützt Pagination mit Query-Parametern (?skip=0&take=20)
- ✅ Gibt Array zurück

#### GET /tweets/:tweetId

- ✅ Ruft einzelnen Tweet ab
- ✅ Gibt 404 zurück für nicht existierenden Tweet

#### PUT /tweets/:tweetId

- ✅ Aktualisiert Tweet erfolgreich
- ✅ Gibt 400 zurück bei ungültigem Content
- ✅ Gibt 403 zurück bei fremdem Tweet (Authorization-Check)

#### POST /tweets/:tweetId/like

- ✅ Liked Tweet erfolgreich
- ✅ Verhindert doppeltes Liken (idempotent)

#### DELETE /tweets/:tweetId/like

- ✅ Entfernt Like erfolgreich

#### POST /tweets/:tweetId/comments

- ✅ Erstellt Kommentar erfolgreich
- ✅ Gibt 400 zurück bei leerem Kommentar
- ✅ Gibt 400 zurück bei zu langem Kommentar (>500 Zeichen)

#### GET /tweets/:tweetId/comments

- ✅ Ruft alle Kommentare ab

#### DELETE /tweets/:tweetId/comments/:commentId

- ✅ Löscht Kommentar erfolgreich
- ✅ Gibt 404 zurück für nicht existierenden Kommentar

#### DELETE /tweets/:tweetId

- ✅ Löscht Tweet erfolgreich
- ✅ Gibt 403 zurück bei fremdem Tweet (Authorization-Check)

## Besonderheiten

### AuthGuard Mocking

In den E2E-Tests wird der AuthGuard gemockt, um JWT-Validierung zu umgehen:

```typescript
const mockAuthGuard = {
  canActivate: jest.fn((context) => {
    const request = context.switchToHttp().getRequest();
    request.user = { sub: 'test-user-123', iat: 1234567890, exp: 9999999999 };
    return true;
  }),
};
```

Dies ermöglicht:

- ✅ Testen ohne laufenden Auth Service
- ✅ Simulation verschiedener User durch Überschreiben des Mocks
- ✅ Fokus auf Tweet-API Logik statt Auth-Infrastruktur

### Validation Testing

Die E2E-Tests validieren:

- ✅ Content-Länge für Tweets (max 280 Zeichen)
- ✅ Content-Länge für Kommentare (max 500 Zeichen)
- ✅ Pflichtfelder (content darf nicht leer sein)
- ✅ Korrekte HTTP-Statuscodes

### Authorization Testing

Die Tests prüfen:

- ✅ Nur Autor kann eigenen Tweet bearbeiten (403)
- ✅ Nur Autor kann eigenen Tweet löschen (403)
- ✅ Nur Autor kann eigenen Kommentar löschen (403)
- ✅ User-ID wird korrekt aus JWT-Payload extrahiert

## Test-Coverage

Um Test-Coverage zu generieren:

```bash
npm run test:cov
```

Die Coverage-Berichte werden in `coverage/` erstellt.

## Kontinuierliche Integration

Die Tests sind bereit für CI/CD-Pipelines:

```yaml
# Beispiel für GitHub Actions
- name: Run tests
  run: |
    npm install
    npm test
    npm run test:e2e
```

## Nächste Schritte

Mögliche Erweiterungen:

- [ ] Tests für getTweetsByUser() Methode
- [ ] Performance-Tests für große Datenmengen
- [ ] Tests für Race-Conditions (z.B. gleichzeitiges Liken)
- [ ] Integration-Tests mit echtem Auth Service
- [ ] Tests für Datenbankintegration (wenn implementiert)

## Fehlersuche

**Problem:** Tests schlagen fehl mit "JWKS URL" Log

- **Lösung:** Das ist nur ein Info-Log vom AuthGuard, kein Fehler

**Problem:** E2E-Tests schlagen fehl mit 401 Unauthorized

- **Lösung:** Prüfe ob AuthGuard korrekt gemockt ist in beforeAll()

**Problem:** "Tweet nicht gefunden" Fehler in Tests

- **Lösung:** Jeder Test erstellt neue App-Instanz, Daten werden nicht geteilt

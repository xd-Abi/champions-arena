# Tweet Service

Der Tweet Service ist zuständig für die Verwaltung von Beiträgen (Tweets), Likes und Kommentaren in der Champions Arena Plattform.

## Features

- ✅ Tweets erstellen, lesen, bearbeiten und löschen
- ✅ Likes hinzufügen und entfernen
- ✅ Kommentare erstellen und löschen
- ✅ Feed mit Pagination
- ✅ JWT-basierte Authentifizierung
- ✅ Input-Validierung
- ✅ CORS-Support

## Installation

```bash
# Dependencies installieren
pnpm install
```

## Konfiguration

Erstelle eine `.env` Datei im Root des Projekts:

```env
PORT=3002
CORS_ORIGIN=http://localhost:3000
```

## Starten

```bash
# Development Mode
pnpm start:dev

# Production Mode
pnpm build
pnpm start:prod
```

## API Endpoints

Alle Endpoints erfordern einen `Authorization: Bearer <token>` Header.

### Tweets

| Methode | Endpoint               | Beschreibung                               |
| ------- | ---------------------- | ------------------------------------------ |
| POST    | `/api/tweets`          | Neuen Tweet erstellen                      |
| GET     | `/api/tweets`          | Feed abrufen (Pagination: ?skip=0&take=20) |
| GET     | `/api/tweets/:tweetId` | Einzelnen Tweet abrufen                    |
| PUT     | `/api/tweets/:tweetId` | Tweet bearbeiten                           |
| DELETE  | `/api/tweets/:tweetId` | Tweet löschen                              |

### Likes

| Methode | Endpoint                    | Beschreibung   |
| ------- | --------------------------- | -------------- |
| POST    | `/api/tweets/:tweetId/like` | Tweet liken    |
| DELETE  | `/api/tweets/:tweetId/like` | Like entfernen |

### Kommentare

| Methode | Endpoint                                   | Beschreibung        |
| ------- | ------------------------------------------ | ------------------- |
| POST    | `/api/tweets/:tweetId/comments`            | Kommentar erstellen |
| GET     | `/api/tweets/:tweetId/comments`            | Kommentare abrufen  |
| DELETE  | `/api/tweets/:tweetId/comments/:commentId` | Kommentar löschen   |

## Beispiel-Requests

### Tweet erstellen

```bash
curl -X POST http://localhost:3002/api/tweets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Mein erster Tweet!"}'
```

### Tweet liken

```bash
curl -X POST http://localhost:3002/api/tweets/TWEET_ID/like \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Kommentar erstellen

```bash
curl -X POST http://localhost:3002/api/tweets/TWEET_ID/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Toller Tweet!"}'
```

## Datenmodell

### Tweet

```typescript
{
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likes: string[];
  comments: Comment[];
}
```

### Comment

```typescript
{
  id: string;
  tweetId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}
```

## Authentifizierung

Der Service verwendet einen AuthGuard, der JWT-Tokens validiert. In der aktuellen Implementierung ist dies eine vereinfachte Mock-Validierung für Entwicklungszwecke.

**Für Produktion:** Der Token sollte gegen den Auth Service validiert werden, der die JWKS-Endpunkte bereitstellt.

## Technologie-Stack

- **Framework:** NestJS
- **Sprache:** TypeScript
- **Validierung:** class-validator, class-transformer
- **ID-Generierung:** UUID

## Entwicklung

```bash
# Tests ausführen
pnpm test

# Linting
pnpm lint

# Formatierung
pnpm format
```

## Hinweise

⚠️ **Wichtig:** Dies ist eine In-Memory-Implementierung. Alle Daten gehen beim Neustart verloren. Für Produktion sollte eine Datenbank (z.B. MongoDB, PostgreSQL) integriert werden.

## Nächste Schritte

Für eine produktionsreife Implementierung:

1. Datenbank-Integration (z.B. TypeORM mit PostgreSQL oder Mongoose mit MongoDB)
2. JWT-Validierung gegen Auth Service
3. Rate Limiting
4. Caching (z.B. Redis)
5. Event-System für Notifications (z.B. über Message Queue)
6. Paginierung mit Cursor-based Navigation
7. Full-text Search für Tweets
8. Media-Upload Support (Bilder, Videos)

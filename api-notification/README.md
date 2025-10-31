# Notification Service - Champions Arena

Der Notification Service verwaltet Echtzeit-Benachrichtigungen für die Champions Arena Plattform.

## 📋 Features

- ✅ Echtzeit-Benachrichtigungen über Server-Sent Events (SSE)
- ✅ Benachrichtigungstypen: Follower, Likes, Comments, Mentions
- ✅ Markieren von Benachrichtigungen als gelesen
- ✅ Push-Notification Subscriptions
- ✅ Event-basierte Integration mit anderen Services
- ✅ In-Memory Storage (einfach auf Datenbank erweiterbar)

## 🚀 Installation & Start

```bash
# Abhängigkeiten installieren
pnpm install

# Development-Modus starten
pnpm run start:dev

# Produktions-Build
pnpm run build
pnpm run start:prod
```

Der Service läuft standardmäßig auf **Port 3003**.

## 📡 API Endpoints

### Notification Endpoints (für Frontend/API Gateway)

#### GET `/api/notifications`
Liste aller Benachrichtigungen abrufen

**Query Parameters:**
- `unreadOnly` (optional): `true` - nur ungelesene Benachrichtigungen
- `limit` (optional): Anzahl der Benachrichtigungen (z.B. `20`)

**Headers:**
- `x-user-id`: User ID (in Produktion: JWT Token)

**Response:**
```json
[
  {
    "id": "notif_1234567890_abc123",
    "userId": "user-123",
    "type": "NEW_FOLLOWER",
    "content": "johndoe folgt dir jetzt",
    "metadata": {
      "fromUserId": "user-456",
      "fromUsername": "johndoe"
    },
    "isRead": false,
    "createdAt": "2025-10-22T10:30:00.000Z"
  }
]
```

#### GET `/api/notifications/count`
Anzahl der ungelesenen Benachrichtigungen

**Response:**
```json
{
  "count": 5
}
```

#### POST `/api/notifications/mark-as-read`
Benachrichtigungen als gelesen markieren

**Body:**
```json
{
  "notificationIds": ["notif_123", "notif_456"]
}
```

#### POST `/api/notifications/mark-all-read`
Alle Benachrichtigungen als gelesen markieren

#### POST `/api/notifications/subscribe`
Push-Benachrichtigungen aktivieren

**Body:**
```json
{
  "deviceToken": "fcm-token-123",
  "platform": "web"
}
```

#### DELETE `/api/notifications/unsubscribe`
Push-Benachrichtigungen deaktivieren

#### GET `/api/notifications/stream` (SSE)
Echtzeit-Stream für Benachrichtigungen

**Beispiel Client-Code:**
```javascript
const eventSource = new EventSource('http://localhost:3003/api/notifications/stream?userId=user-123');

eventSource.addEventListener('notification', (event) => {
  const notification = JSON.parse(event.data);
  console.log('Neue Benachrichtigung:', notification);
});
```

### Event Endpoints (für andere Microservices)

Diese Endpoints werden intern von anderen Services aufgerufen:

#### POST `/api/events/follower`
```json
{
  "userId": "user-123",
  "followerId": "user-456",
  "followerUsername": "johndoe"
}
```

#### POST `/api/events/like`
```json
{
  "tweetAuthorId": "user-123",
  "likerId": "user-456",
  "likerUsername": "johndoe",
  "tweetId": "tweet-789"
}
```

#### POST `/api/events/comment`
```json
{
  "tweetAuthorId": "user-123",
  "commenterId": "user-456",
  "commenterUsername": "johndoe",
  "tweetId": "tweet-789",
  "commentId": "comment-012"
}
```

#### POST `/api/events/mention`
```json
{
  "mentionedUserId": "user-123",
  "mentionerId": "user-456",
  "mentionerUsername": "johndoe",
  "tweetId": "tweet-789"
}
```

## 🏗️ Architektur

### Komponenten

1. **notification.entity.ts**: Entity-Klasse für Benachrichtigungen
2. **notification.service.ts**: Business-Logik und Datenverwaltung
3. **notification.controller.ts**: REST-Endpoints für Clients
4. **event.controller.ts**: Event-Endpoints für Service-Integration
5. **notification.events.ts**: Event-Definitionen

### Benachrichtigungstypen

```typescript
enum NotificationType {
  NEW_FOLLOWER = 'NEW_FOLLOWER',  // Neuer Follower
  LIKE = 'LIKE',                  // Tweet wurde geliked
  COMMENT = 'COMMENT',            // Tweet wurde kommentiert
  MENTION = 'MENTION',            // User wurde erwähnt
}
```

## 🔄 Integration mit anderen Services

### Tweet Service → Notification Service

Wenn ein Tweet geliked wird:
```typescript
// Im Tweet Service nach dem Like
await fetch('http://notification-service:3003/api/events/like', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tweetAuthorId: tweet.authorId,
    likerId: currentUser.id,
    likerUsername: currentUser.username,
    tweetId: tweet.id
  })
});
```

### User Profile Service → Notification Service

Wenn jemand einem User folgt:
```typescript
// Im Profile Service nach dem Follow
await fetch('http://notification-service:3003/api/events/follower', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: targetUser.id,
    followerId: currentUser.id,
    followerUsername: currentUser.username
  })
});
```

## 🔐 Authentifizierung

Aktuell verwendet der Service einen `x-user-id` Header für die Entwicklung.

**Für Produktion:**
1. JWT Token vom Auth Service validieren
2. User-ID aus Token extrahieren
3. Entsprechenden Code in `getUserIdFromRequest()` implementieren

```typescript
private getUserIdFromRequest(req: Request): string {
  // JWT Token aus Authorization Header
  const token = req.headers.authorization?.split(' ')[1];
  
  // Token validieren (gegen Auth Service JWKS)
  const decoded = await this.authService.verifyToken(token);
  
  return decoded.sub; // User ID aus Token
}
```

## 💾 Datenspeicherung

Aktuell werden Benachrichtigungen **In-Memory** gespeichert.

**Für Produktion - Migration zu Datenbank:**

### Option 1: PostgreSQL mit TypeORM
```typescript
@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  // ... weitere Felder
}
```

### Option 2: MongoDB mit Mongoose
```typescript
const NotificationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: Object.values(NotificationType) },
  content: String,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
```

## 🧪 Testing

```bash
# Unit Tests
pnpm run test

# E2E Tests
pnpm run test:e2e

# Test Coverage
pnpm run test:cov
```

### Beispiel Test-Request mit curl

```bash
# Benachrichtigungen abrufen
curl -H "x-user-id: user-123" http://localhost:3003/api/notifications

# Benachrichtigung als gelesen markieren
curl -X POST http://localhost:3003/api/notifications/mark-as-read \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{"notificationIds": ["notif_123"]}'

# Event triggern (simuliert anderen Service)
curl -X POST http://localhost:3003/api/events/follower \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "followerId": "user-456",
    "followerUsername": "johndoe"
  }'
```

## 🌐 Environment Variables

```env
PORT=3003
FRONTEND_URL=http://localhost:3000
```

## 📚 Weitere Informationen

- [NestJS Dokumentation](https://docs.nestjs.com/)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

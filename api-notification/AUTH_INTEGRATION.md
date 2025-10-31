# 🔐 Auth Service Integration

Der Notification Service ist jetzt mit dem Auth Service integriert und verwendet JWT-Token für die Authentifizierung.

## 🏗️ Architektur

```
┌─────────────┐      JWT Token      ┌──────────────────┐
│   Client    │ ──────────────────> │   Notification   │
│  (Frontend) │                     │     Service      │
└─────────────┘                     └──────────────────┘
                                             │
                                             │ Validiert Token
                                             ▼  
                                    ┌──────────────────┐
                                    │   Auth Service   │
                                    │   (Port 3000)    │
                                    │   JWKS Endpoint  │
                                    └──────────────────┘
```

## 🔧 Komponenten

### 1. **AuthService** (`src/auth/auth.service.ts`)
- Holt Public Key vom Auth Service (JWKS Endpoint)
- Validiert JWT Tokens
- Extrahiert User ID aus Token

### 2. **JwtAuthGuard** (`src/auth/jwt-auth.guard.ts`)
- NestJS Guard für Route-Protection
- Prüft Authorization Header
- Fügt User ID zum Request hinzu

### 3. **CurrentUser Decorator** (`src/auth/current-user.decorator.ts`)
- Einfacher Zugriff auf User ID in Controllern
- Beispiel: `@CurrentUser() userId: string`

## 🚀 Verwendung

### Development Mode (mit x-user-id Header)

```bash
# Für Testing/Development - funktioniert ohne Token
curl -H "x-user-id: user-123" http://localhost:3003/api/notifications
```

### Production Mode (mit JWT Token)

```bash
# Mit echtem JWT Token vom Auth Service
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:3003/api/notifications
```

## 📝 Postman Testing

### Schritt 1: Token vom Auth Service holen

1. **Auth Service Login:**
```
GET http://localhost:3000/authorize
```
(Öffnet Google Login im Browser)

2. **Nach Login - Token kopieren** aus `/callback` Response:
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Schritt 2: Token in Postman verwenden

**Für Production:**
- **Authorization:** `Bearer Token`
- **Value:** `YOUR_TOKEN_HERE`

**Für Development:**
- **Header:** `x-user-id`
- **Value:** `user-123`

## 🔒 Geschützte Endpoints

Alle Notification Endpoints sind jetzt geschützt:

- ✅ `GET /api/notifications` - JWT Required
- ✅ `GET /api/notifications/count` - JWT Required
- ✅ `POST /api/notifications/mark-as-read` - JWT Required
- ✅ `POST /api/notifications/mark-all-read` - JWT Required
- ✅ `POST /api/notifications/subscribe` - JWT Required
- ✅ `DELETE /api/notifications/unsubscribe` - JWT Required
- ⚠️ `GET /api/notifications/stream` - Query Parameter (SSE Limitation)

## 🎯 Event Endpoints (Service-to-Service)

Event Endpoints sind **NICHT** geschützt, da sie von anderen Services aufgerufen werden:

- `POST /api/events/follower`
- `POST /api/events/like`
- `POST /api/events/comment`
- `POST /api/events/mention`

**Für Produktion:** Diese sollten mit API Keys oder Service-to-Service Authentication geschützt werden.

## 🧪 Testing

### Test-Workflow:

```powershell
# 1. Auth Service starten
cd api-auth
npm run start:dev

# 2. Notification Service starten
cd ../api-notification
npm run start:dev

# 3. Development Mode (mit x-user-id)
curl -H "x-user-id: user-123" http://localhost:3003/api/notifications

# 4. Production Mode (mit JWT - nach Auth Service Login)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3003/api/notifications
```

## ⚙️ Environment Variables

`.env` Datei:

```env
PORT=3003
FRONTEND_URL=http://localhost:3000

# Auth Service Integration
AUTH_SERVICE_URL=http://localhost:3000
NODE_ENV=development  # 'production' für JWT-Erzwingung
```

## 🔄 Mode Switching

### Development Mode (Standard)
- Akzeptiert `x-user-id` Header
- Keine Token-Validierung
- Gut für lokales Testing

```typescript
NODE_ENV=development
```

### Production Mode
- Erzwingt JWT Token
- Validiert gegen Auth Service
- Wirft Fehler bei fehlendem/ungültigem Token

```typescript
NODE_ENV=production
```

## 🐛 Troubleshooting

### Problem: "Invalid or missing authentication"
- ✅ Prüfe `x-user-id` Header (Development)
- ✅ Prüfe `Authorization: Bearer TOKEN` (Production)
- ✅ Prüfe Auth Service läuft auf Port 3000

### Problem: "Could not verify token"
- ✅ Prüfe Auth Service erreichbar: `curl http://localhost:3000/jwks`
- ✅ Token vom Auth Service muss gültig sein
- ✅ Zeitstempel (exp) prüfen

### Problem: "Cannot find module 'jose'"
```bash
cd api-notification
npm install jose@5.9.6 @nestjs/jwt
```

## 📚 Code Beispiele

### Controller mit Auth:

```typescript
@Controller('notifications')
@UseGuards(JwtAuthGuard)  // Alle Routes geschützt
export class NotificationController {
  
  @Get()
  async getNotifications(@CurrentUser() userId: string) {
    // userId ist automatisch aus JWT extrahiert
    return this.notificationService.getNotifications(userId);
  }
}
```

### Service-to-Service Call (von Tweet Service):

```typescript
// Im Tweet Service: Event an Notification Service senden
async notifyLike(tweetId: string, likerId: string) {
  await fetch('http://notification-service:3003/api/events/like', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tweetAuthorId: tweet.authorId,
      likerId: likerId,
      likerUsername: liker.username,
      tweetId: tweetId
    })
  });
}
```

## 🎉 Features

- ✅ JWT Token Validierung gegen Auth Service
- ✅ Automatische User ID Extraktion
- ✅ Development Mode für einfaches Testing
- ✅ Production-Ready Authentication
- ✅ Service-to-Service Communication Support
- ✅ Saubere Decorator-basierte API

## 📖 Weiterführende Links

- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)

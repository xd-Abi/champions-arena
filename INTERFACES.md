# Champions Arena – API-Dokumentation

Dieses Dokument beschreibt die **Schnittstellen (APIs)** der Microservices von Champions Arena.
Alle Requests laufen über das **API Gateway** und werden dann an die zuständigen Services weitergeleitet.
Die Authentifizierung erfolgt ausschliesslich über **Google OAuth2** mit JWT-Tokens.

## 1. Auth Service

Der Auth Service stellt die **OAuth2 / JWT-Integration** bereit.
Es gibt **keine klassische Registrierung** – neue Benutzer:innen authentifizieren sich ausschliesslich via **Google Login**.

**Base Path:** `/auth`

| Methode | Endpoint     | Beschreibung                                                                                 |
| ------- | ------------ | -------------------------------------------------------------------------------------------- |
| **GET** | `/authorize` | Leitet Nutzer:innen zu Google OAuth weiter.                                                  |
| **GET** | `/callback`  | Callback von Google nach erfolgreicher Authentifizierung. Generiert ein JWT für die Session. |
| **GET** | `/jwks.json` | Stellt Public Keys zum Validieren von JWTs bereit.                                           |

**JWT Claims Beispiel:**

```json
{
  "sub": "google-oauth2|1234567890",
  "iat": 1691234567,
  "exp": 1691238167
}
```

## 2. User Profile Service

Verwaltet **Profile, Follower und Statistiken**.

**Base Path:** `/users`

| Methode    | Endpoint              | Beschreibung                                       |
| ---------- | --------------------- | -------------------------------------------------- |
| **GET**    | `/me`                 | Eigenes Profil abrufen.                            |
| **PUT**    | `/me`                 | Eigenes Profil bearbeiten (Name, Bio).             |
| **POST**   | `/me/picture`         | Profilbild hochladen.                              |
| **DELETE** | `/me/picture`         | Profilbild löschen.                                |

## 3. Tweet Service

Stellt die **Beiträge (Tweets) und Interaktionen** bereit.

**Base Path:** `/tweets`

| Methode    | Endpoint                          | Beschreibung                                 |
| ---------- | --------------------------------- | -------------------------------------------- |
| **POST**   | `/`                               | Neuen Beitrag erstellen.                     |
| **GET**    | `/`                               | Feed abrufen (optional: Pagination, Filter). |
| **GET**    | `/{tweetId}`                      | Einzelnen Beitrag abrufen.                   |
| **PUT**    | `/{tweetId}`                      | Beitrag bearbeiten (nur Autor).              |
| **DELETE** | `/{tweetId}`                      | Beitrag löschen (nur Autor/Admin).           |
| **POST**   | `/{tweetId}/like`                 | Beitrag liken.                               |
| **DELETE** | `/{tweetId}/like`                 | Like entfernen.                              |
| **POST**   | `/{tweetId}/comments`             | Kommentar erstellen.                         |
| **GET**    | `/{tweetId}/comments`             | Kommentare abrufen.                          |
| **DELETE** | `/{tweetId}/comments/{commentId}` | Kommentar löschen.                           |

## 4. Notification Service

Verwaltet **Benachrichtigungen & Events**.

**Base Path:** `/notifications`

| Methode    | Endpoint           | Beschreibung                                       |
| ---------- | ------------------ | -------------------------------------------------- |
| **GET**    | `/`                | Liste ungelesener Benachrichtigungen.              |
| **POST**   | `/mark-as-read`    | Markiert bestimmte Benachrichtigungen als gelesen. |
| **POST**   | `/subscribe`       | Gerät oder WebSocket registrieren (Push).          |
| **DELETE** | `/unsubscribe`     | Registrierung wieder entfernen.                    |
| **GET**    | `/stream` (SSE/WS) | Echtzeit-Stream für Benachrichtigungen.            |

## 5. API Gateway

Das Gateway ist der **zentrale Einstiegspunkt**.
Es validiert Tokens (gegen `/auth/jwks.json`) und leitet Anfragen an die passenden Services:

* `/api/auth/...` → **Auth Service**
* `/api/users/...` → **User Profile Service**
* `/api/tweets/...` → **Tweet Service**
* `/api/notifications/...` → **Notification Service**


## 6. Frontend

Das Frontend greift **ausschliesslich über das API Gateway** auf die Services zu.
Es bietet u. a.:

* Anmeldung via Google OAuth
* Anzeige des Feeds
* Erstellen von Tweets
* Anzeigen & Bearbeiten von Profilen
* Benachrichtigungen in Echtzeit

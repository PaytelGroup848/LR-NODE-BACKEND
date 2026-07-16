# LR License Key Management Backend


## Environment Variables

- `PORT`: Port to run the server on (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `BREVO_API_KEY`: Brevo (Sendinblue) API key for sending emails
- `BREVO_SENDER_EMAIL`: Email address to use as sender
- `BREVO_SENDER_NAME`: Name to use as sender

## API Endpoints

### Auth
- `POST /auth/login`: Login with email and password to get JWT token

### Superadmin
- `GET /superadmin/dashboard`: Get platform-wide stats
- `POST /superadmin/clients`: Create a new client
- `GET /superadmin/clients`: List all clients (paginated, filterable, searchable)
- `GET /superadmin/clients/:id`: Get a specific client
- `POST /superadmin/clients/:id/keys/generate`: Generate keys for a client
- `GET /superadmin/keys`: List all keys (paginated, filterable)
- `PATCH /superadmin/keys/:keyId`: Update a key
- `PATCH /superadmin/keys/:keyId/suspend`: Suspend a key
- `PATCH /superadmin/keys/:keyId/unsuspend`: Unsuspend a key
- `POST /superadmin/keys/:keyId/send-email`: Send key email to client
- `POST /superadmin/partners`: Create a new partner
- `GET /superadmin/partners`: List all partners (paginated, filterable, searchable)
- `GET /superadmin/partners/:id`: Get a specific partner
- `POST /superadmin/partners/:id/keys/generate-bulk`: Generate bulk keys for a partner
- `POST /superadmin/partners/:id/keys/send-email`: Send bulk keys email to partner
- `PATCH /superadmin/partners/:id/suspend`: Suspend a partner
- `PATCH /superadmin/partners/:id/unsuspend`: Unsuspend a partner
- `GET /superadmin/partners/:id/stats`: Get partner stats

### Partner
- `GET /partner/dashboard`: Get partner dashboard stats
- `POST /partner/clients`: Create a new client
- `GET /partner/clients`: List partner's clients (paginated, filterable, searchable)
- `GET /partner/keys`: List partner's keys (paginated, filterable)
- `POST /partner/keys/:keyId/assign`: Assign a key to a client
- `PATCH /partner/keys/:keyId/suspend`: Suspend a key
- `PATCH /partner/keys/:keyId/unsuspend`: Unsuspend a key
- `POST /partner/keys/:keyId/send-email`: Send key email to client

### Client
- `GET /license-client/dashboard`: Get client dashboard
- `GET /license-client/keys`: List client's keys (paginated)

### Public (Unauthenticated)
- `POST /public/keys/validate`: Validate a license key

## Public API - For LR Python Integration

### Validate Key

**Endpoint**: `POST /public/keys/validate`

**Request Body**:
```json
{
  "key": "LR-XXXXXXXX-XXXXXXXX"
}
```

**Response (Valid Active Key)**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "status": "active",
    "expiresAt": "2027-01-15T00:00:00.000Z"
  }
}
```

**Response (Invalid/Suspended/Expired/Not Found)**:
```json
{
  "success": true,
  "data": {
    "valid": false,
    "status": "suspended" | "expired" | "not_found"
  }
}
```

**Notes**:
- No authentication required
- Rate limited to 30 requests per minute per IP
- Key format must be `LR-XXXXXXXX-XXXXXXXX` (8 uppercase hex characters in each part)

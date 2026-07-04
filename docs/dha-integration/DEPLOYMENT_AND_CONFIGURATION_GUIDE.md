# Deployment & Configuration Guide: DHA Integration

## Environment Variables
The application requires strict configuration for DHA integration to function in `sandbox` or `production` modes. `env.validation.ts` enforces these constraints on startup.

Add the following to your `.env` file:

```env
# Enable/Disable DHA Integration entirely
DHA_ENABLED=true

# Mode: 'mock' (local dev), 'sandbox' (UAT), or 'production' (Live)
DHA_MODE=sandbox

# Base URLs
DHA_BASE_URL=https://afyalink-sbx.dha.go.ke
DHA_TOKEN_URL=https://auth-sbx.dha.go.ke/oauth/token

# Authentication Credentials provided by DHA
DHA_CLIENT_ID=your_client_id_here
DHA_CLIENT_SECRET=your_client_secret_here

# Your Facility's official KMHFL Code
DHA_FACILITY_CODE=12345

# Optional Resiliency Config
DHA_TIMEOUT_MS=15000
DHA_MAX_ATTEMPTS=8
INTEGRATION_WORKER_ENABLED=true
```

## Security Best Practices
- **Never commit `.env` files.**
- `DHA_CLIENT_SECRET` must be injected via a secure secret manager (e.g., AWS Secrets Manager, Kubernetes Secrets) in production environments.
- Ensure outbound traffic on port 443 is allowed to `*.dha.go.ke`.

## Pre-Flight Checks
1. Boot the application in `sandbox` mode.
2. Verify that the backend successfully starts without `env.validation.ts` throwing an exception.
3. Check the Integration Command Center UI (`/integration`) and ensure the DHA Auth Token card displays **Online**.

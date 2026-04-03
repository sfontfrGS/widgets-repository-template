# Connector Setup Guide

This guide explains how to create and manage connectors in the widgets repository.

## What Are Connectors?

Connectors are secure HTTP proxy definitions that widgets use to call external APIs without exposing credentials. When a widget needs to fetch data from an external service or submit data to an API, connectors handle the request through a secure backend proxy. This means:

- API keys and secrets are never exposed to the browser
- Authentication is handled server-side
- Request templates can include dynamic user and tenant data
- Widget code simply calls a connector by its permalink using the SDK

## File Structure

Each widget can optionally include a `connectors.json` file alongside its `widget.json`:

```
widgets-repo-template/
├── bin/
│   └── build-registry.sh       # Builds widget_registry.json and connectors_registry.json
├── widget_registry.json        # Generated widget registry (DO NOT EDIT MANUALLY)
├── connectors_registry.json    # Generated connector registry (DO NOT EDIT MANUALLY)
└── widgets/
    ├── WIDGET_SETUP.md
    ├── CONNECTOR_SETUP.md      # This documentation file
    └── my_widget/
        ├── widget.json         # Widget configuration
        ├── connectors.json     # Connector definitions (optional)
        └── dist/
            └── content.html
```

The build script scans all widget directories for `connectors.json` files and merges them into a single `connectors_registry.json` at the repository root.

## Schema Reference

### connectors.json

The `connectors.json` file contains a top-level `connectors` array. Each connector object defines a single HTTP proxy endpoint.

```json
{
  "connectors": [
    {
      "name": "My API",
      "url": "https://api.example.com/v1/data",
      "method": "GET",
      "headers": [...],
      "query_parameters": [...],
      "authentication": {...},
      "request_body": "...",
      "permalink": "my-api"
    }
  ]
}
```

### Connector Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name of the connector (max 255 characters) |
| `url` | string | Yes | The target URL for the HTTP request. Supports Jinja2 templates. |
| `method` | string | No | HTTP method: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD`. Defaults to `GET` if not specified in the service. |
| `headers` | array | No | HTTP headers to include in the request |
| `query_parameters` | array | No | Query parameters to append to the URL |
| `authentication` | object | No | Authentication configuration |
| `request_body` | string | No | Request body template (Jinja2 supported) |
| `response_body` | string | No | Jinja2 template that transforms the upstream API response before returning it to the widget. If blank, the response is returned as-is. |
| `response_content_type` | string | No | Content-Type override for the transformed response. If blank, the upstream Content-Type is preserved. |
| `permalink` | string | No | URL-safe identifier. Auto-generated from `name` if omitted. |

### Headers

Each header is an object with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Header name |
| `value` | string | Yes | Header value (Jinja2 templates supported) |
| `overridable` | boolean | No | Whether the widget can override this header at execution time. Defaults to `false`. |

```json
"headers": [
  { "key": "Accept", "value": "application/json", "overridable": false },
  { "key": "X-Custom", "value": "{{ tenant_id }}", "overridable": true }
]
```

### Query Parameters

Each query parameter is an object with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Parameter name |
| `value` | string | Yes | Parameter value (Jinja2 templates supported) |
| `overridable` | boolean | No | Whether the widget can override this parameter at execution time. Defaults to `false`. |

```json
"query_parameters": [
  { "key": "category", "value": "featured", "overridable": true },
  { "key": "tenant", "value": "{{ tenant_id }}", "overridable": false }
]
```

## Authentication Types

### API Key

Sends an API key as a header or query parameter.

```json
"authentication": {
  "type": "apikey",
  "config": {
    "key": "X-API-Key",
    "value": "{{ get_secret('my_api_key') }}",
    "in": "header"
  }
}
```

| Field | Description |
|-------|-------------|
| `key` | The header or query parameter name |
| `value` | The API key value (use `get_secret()` for secure storage) |
| `in` | Where to send the key: `"header"` or `"query"` |

### OAuth Client Credentials

Uses client credentials grant to obtain an access token.

```json
"authentication": {
  "type": "oauth_client_credentials",
  "config": {
    "client_id": "{{ get_secret('oauth_client_id') }}",
    "client_secret": "{{ get_secret('oauth_client_secret') }}",
    "token_url": "https://auth.example.com/oauth/token",
    "scope": "read:data write:data"
  }
}
```

| Field | Description |
|-------|-------------|
| `client_id` | OAuth client ID |
| `client_secret` | OAuth client secret |
| `token_url` | Token endpoint URL |
| `scope` | Space-separated list of scopes (optional) |

### JWT (JSON Web Token)

Signs a JWT on every request and sends it as a Bearer token.

```json
"authentication": {
  "type": "jwt",
  "config": {
    "private_key": "{{ get_secret('jwt_signing_key') }}",
    "algorithm": "RS256",
    "claims": {
      "iss": "my-app",
      "sub": "{{ user.email }}",
      "exp": "{{ now(3600) }}"
    },
    "jwt_headers": {
      "kid": "key-2024"
    }
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `private_key` | Yes | Signing key (use `get_secret()`) |
| `claims` | Yes | JWT payload claims (must have at least one). Numeric string values are coerced to integers. |
| `algorithm` | No | Signing algorithm (default: `RS256`). Supported: HS256, HS384, HS512, RS256, RS384, RS512, ES256, ES384, ES512, PS256, PS384, PS512, EdDSA |
| `jwt_headers` | No | Custom JWT headers (e.g., `kid`) |

### OAuth JWT Bearer

Signs a JWT assertion, exchanges it for an access token at the token endpoint, and caches the token.

```json
"authentication": {
  "type": "oauth_jwt_bearer",
  "config": {
    "client_id": "{{ get_secret('sf_client_id') }}",
    "private_key": "{{ get_secret('sf_private_key') }}",
    "token_url": "https://login.salesforce.com/services/oauth2/token",
    "subject": "admin@myorg.com",
    "audience": "https://login.salesforce.com",
    "token_ttl": 3600,
    "algorithm": "RS256",
    "additional_claims": {
      "scope": "api refresh_token"
    }
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `client_id` | Yes | OAuth client ID (issuer of the JWT) |
| `private_key` | Yes | Private key for signing the JWT assertion |
| `token_url` | Yes | OAuth token endpoint URL |
| `subject` | Yes | JWT subject claim (e.g., user or service account email) |
| `audience` | Yes | JWT audience claim (e.g., token endpoint URL) |
| `token_ttl` | No | Access token cache TTL in seconds (default: 3600) |
| `algorithm` | No | JWT signing algorithm (default: `RS256`) |
| `additional_claims` | No | Extra JWT payload claims merged on top of standard claims |
| `jwt_headers` | No | Custom JWT headers (e.g., `kid`) |

## Jinja2 Template Variables

Connector fields that support Jinja2 templates (url, header values, query parameter values, request_body, authentication config values) have access to these variables. The `response_body` field has a different variable set — see [Response Transformation](#response-transformation).

### User Variables

| Variable | Description |
|----------|-------------|
| `user.id` | Current user's ID |
| `user.email` | Current user's email address |
| `user.name` | Current user's display name |
| `user.first_name` | Current user's first name |
| `user.last_name` | Current user's last name |

### Context Variables

| Variable | Description |
|----------|-------------|
| `tenant_id` | The current tenant identifier |
| `body_text` | The request body as a string (from SDK call) |
| `body_raw` | The raw request body bytes |

### Functions

| Function | Description |
|----------|-------------|
| `get_secret('key')` | Retrieves a secret value by key from secure storage |
| `now()` | Returns the current Unix timestamp (integer) |
| `jwt_encode(payload, key, algorithm='HS256')` | Encodes a JWT token with the given payload, signing key, and algorithm |

### Filters

| Filter | Description |
|--------|-------------|
| `from_json` | Parses a JSON string into an object |
| `json_encode` | Serializes a value to a JSON string |
| `base64_encode` | Encodes a value to Base64 |
| `base64_decode` | Decodes a Base64 string |
| `default(value)` | Returns the given default if the variable is undefined or empty |

**Example using filters:**
```json
{
  "request_body": "{ \"data\": {{ body_text | from_json | json_encode }}, \"encoded\": \"{{ user.email | base64_encode }}\" }"
}
```

## Permalink Rules

Each connector has a permalink: a URL-safe identifier used to call the connector from widget code.

- If `permalink` is provided in `connectors.json`, it must match the format `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase letters, numbers, and dashes only; no leading/trailing dashes; no consecutive dashes)
- If `permalink` is omitted, the build script auto-generates one from `name` by converting to lowercase and replacing spaces/special characters with dashes
- Permalinks must be unique across ALL connectors in the repository (not just within a single widget)

**Examples:**

| Name | Auto-generated permalink |
|------|--------------------------|
| REST Countries | `rest-countries` |
| Weather Forecast | `weather-forecast` |
| My Widget's Data Feed | `my-widget-s-data-feed` |

## Calling Connectors from Widget Code

Widgets call connectors using the Widget SDK. The SDK handles the secure proxy request transparently.

### Basic GET Request

```html
<script>
  (async () => {
    const sdk = new window.WidgetServiceSDK();
    try {
      const countries = await sdk.connectors.execute({
        permalink: "rest-countries",
        method: "GET"
      });
      console.log("Countries:", countries);
    } catch (error) {
      console.error("Request failed:", error);
    }
  })();
</script>
```

### GET with Overridden Query Parameters

Overridable query parameters can be set or changed at execution time:

```html
<script>
  (async () => {
    const sdk = new window.WidgetServiceSDK();
    const weather = await sdk.connectors.execute({
      permalink: "weather-forecast",
      method: "GET",
      queryParams: { latitude: "48.85", longitude: "2.35" }
    });
    console.log("Weather:", weather);
  })();
</script>
```

### POST with Request Body

```html
<script>
  (async () => {
    const sdk = new window.WidgetServiceSDK();
    const result = await sdk.connectors.execute({
      permalink: "my-api",
      method: "POST",
      body: JSON.stringify({ card_id: "abc-123" })
    });
    console.log("Result:", result);
  })();
</script>
```

## Response Transformation

The `response_body` field lets you reshape an upstream API response using a Jinja2 template before the widget receives it. This is useful for simplifying complex API payloads, extracting only the fields you need, or restructuring data so widget code stays clean.

### Template Variables

The response transformation template has access to:

| Variable | Description |
|----------|-------------|
| `response.body` | The raw response body as a string |
| `response.status_code` | The HTTP status code (integer) |
| `response.headers` | Response headers (dict, lowercase keys) |
| `user.*` | Current user variables (same as request templates) |
| `tenant_id` | The current tenant identifier |

**Note:** `get_secret()` is NOT available in response templates.

### Example: Simplify REST Countries Response

The REST Countries API returns deeply nested objects. A response transformation can flatten and filter the data so the widget receives a simple array:

```json
{
  "response_body": "{% set countries = response.body | from_json | sort(attribute='population', reverse=true) %}[{% for country in countries[:5] %}{{ {'name': country.name.common, 'capital': country.capital[0], 'population': country.population, 'flag': country.flags.png, 'region': country.region} | tojson }}{% if not loop.last %}, {% endif %}{% endfor %}]",
  "response_content_type": "application/json"
}
```

This template:
1. Parses the JSON response body
2. Sorts countries by population (descending)
3. Takes the top 5
4. Returns a simplified JSON array with flattened fields (`name` instead of `name.common`, `capital` instead of `capital[0]`)

The widget code can then use simple field access:
```js
// Before transformation: country.name.common, country.capital[0]
// After transformation:  country.name, country.capital
var countries = await sdk.connectors.execute({ permalink: "rest-countries", method: "GET" });
countries.forEach(function (country) {
  console.log(country.name, country.capital, country.population);
});
```

## How the Build Script Processes Connectors

1. **Scans** each `widgets/<name>/` directory for a `connectors.json` file
2. **Validates** JSON syntax of each `connectors.json`
3. **Validates** the top-level `connectors` array exists
4. **Validates** each connector:
   - `name` is present, non-empty, and max 255 characters
   - `url` is present and non-empty
   - `method` (if present) is one of GET/POST/PUT/DELETE/PATCH/OPTIONS/HEAD
   - `permalink` (if present) matches the format `^[a-z0-9]+(-[a-z0-9]+)*$`
5. **Auto-generates** permalink from `name` if not provided
6. **Checks** permalink uniqueness across all connectors in the repository
7. **Merges** all connectors into a single `connectors_registry.json` at the repo root

## Validation Rules

The build script validates:

- `connectors.json` is valid JSON
- Top-level `connectors` field is an array
- Each connector has a `name` (non-empty string, max 255 characters)
- Each connector has a `url` (non-empty string)
- `method` (if present) is a valid HTTP method
- `permalink` (if present) matches the required format
- No duplicate permalinks across the entire repository

## Best Practices

1. **Never hardcode secrets** - Always use `get_secret('key_name')` for API keys, tokens, and credentials
2. **Use overridable parameters** - Mark headers and query parameters as `overridable: true` when widgets should be able to customize them at runtime
3. **Provide explicit permalinks** - While auto-generation works, explicit permalinks are more predictable and won't change if you rename the connector
4. **Keep connectors focused** - Each connector should represent a single API endpoint or action
5. **Use descriptive names** - The `name` field should clearly describe what the connector does
6. **Group related connectors** - Keep connectors for the same external service in the same widget's `connectors.json`
7. **Document your connectors** - Add comments in your widget's `content.html` showing how to call each connector
8. **Test with dry-run** - Use `./bin/build-registry.sh --dry-run` to preview the generated registry before committing

## Troubleshooting

### Build fails with "missing top-level connectors array"

Ensure your `connectors.json` has the correct structure:
```json
{
  "connectors": [...]
}
```

The `connectors` field must be an array, even if it contains a single connector.

### Build fails with "invalid permalink format"

Permalinks must match `^[a-z0-9]+(-[a-z0-9]+)*$`:
- Only lowercase letters, numbers, and dashes
- No leading or trailing dashes
- No consecutive dashes
- No spaces or special characters

### Build fails with "Duplicate connector permalink"

Permalinks must be unique across ALL connectors in the repository, not just within a single widget. Rename one of the conflicting permalinks.

### Connector not appearing in connectors_registry.json

1. Check that `connectors.json` exists in the widget directory (alongside `widget.json`)
2. Verify `connectors.json` is valid JSON: `jq . widgets/<name>/connectors.json`
3. Run with `--dry-run` to see detailed error messages

### SDK execute call fails at runtime

1. Verify the permalink matches exactly (case-sensitive)
2. Check that the connector's `method` matches what your SDK call expects
3. Ensure secrets referenced by `get_secret()` are configured in the service
4. Check the service logs for authentication or upstream API errors

## Further Reading

For complete documentation on connectors, authentication, secrets, and the Widget SDK, see the [official documentation](https://developers.insided.com/docs).

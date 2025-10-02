# Oncore Backend API

A clean, modular backend API designed to be reusable across web and mobile platforms.

## 🏗️ Architecture

```
backend/
├── src/
│   ├── controllers/    # HTTP request handlers
│   ├── services/       # Business logic
│   ├── routes/         # Route definitions
│   ├── middleware/     # Express/Next.js middleware
│   ├── utils/          # Helper functions
│   ├── types/          # TypeScript types
│   └── config/         # Configuration files
```

## 📋 Features

- ✅ Complete separation from frontend
- ✅ RESTful API design
- ✅ Type-safe with TypeScript
- ✅ Input validation with Zod
- ✅ Centralized error handling
- ✅ Reusable for web and mobile
- ✅ Clean architecture (Routes → Controllers → Services)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Run Development Server

The backend runs as part of the Next.js application:

```bash
cd ../client
npm run dev
```

## 📚 API Documentation

### Shows API

#### List Shows

```http
GET /api/shows?org_id={orgId}&upcoming=true&limit=20&offset=0
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "title": "My Show",
      "date": "2025-10-15",
      "set_time": "2025-10-15T20:00:00",
      "venue": {
        "id": "uuid",
        "name": "Venue Name",
        "city": "City",
        "state": "State"
      }
    }
  ]
}
```

#### Get Show by ID

```http
GET /api/shows/{id}?org_id={orgId}
Authorization: Bearer {token}
```

#### Create Show

```http
POST /api/shows
Authorization: Bearer {token}
Content-Type: application/json

{
  "org_id": "uuid",
  "title": "My Show",
  "date": "2025-10-15",
  "set_time": "20:00",
  "venue_id": "uuid",
  "notes": "Optional notes"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    /* show object */
  },
  "message": "Show created successfully"
}
```

#### Update Show

```http
PATCH /api/shows/{id}?org_id={orgId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  "date": "2025-10-16"
}
```

#### Delete Show

```http
DELETE /api/shows/{id}?org_id={orgId}
Authorization: Bearer {token}
```

#### Get Upcoming Shows

```http
GET /api/shows/upcoming?org_id={orgId}&limit=10
Authorization: Bearer {token}
```

## 🔧 Development

### Project Structure

```
backend/src/
├── controllers/
│   └── shows.controller.ts      # Request handlers
├── services/
│   └── shows.service.ts         # Business logic
├── routes/
│   ├── index.ts                 # API routes registry
│   └── shows.routes.ts          # Shows route definitions
├── types/
│   ├── api.types.ts             # API response types
│   ├── show.types.ts            # Show-specific types
│   └── index.ts                 # Type exports
├── utils/
│   ├── supabase.ts              # Supabase client
│   ├── response.ts              # Response helpers
│   ├── validation.ts            # Input validation
│   └── errors.ts                # Custom errors
└── config/
    ├── env.ts                   # Environment config
    └── constants.ts             # App constants
```

### Adding a New Resource

1. **Create Types** (`types/resource.types.ts`)

```typescript
export interface Resource {
  id: string;
  name: string;
  // ... other fields
}

export interface CreateResourceRequest {
  name: string;
  // ... other fields
}
```

2. **Create Service** (`services/resource.service.ts`)

```typescript
export class ResourceService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async list() {
    // Implementation
  }

  async create(data: CreateResourceRequest) {
    // Implementation
  }
}
```

3. **Create Controller** (`controllers/resource.controller.ts`)

```typescript
export class ResourceController {
  static async list(request: NextRequest) {
    // Validate input
    // Call service
    // Return response
  }
}
```

4. **Create Routes** (`routes/resource.routes.ts`)

```typescript
export async function GET(request: NextRequest) {
  return ResourceController.list(request);
}

export async function POST(request: NextRequest) {
  return ResourceController.create(request);
}
```

5. **Wire Up in Next.js** (`client/app/api/resource/route.ts`)

```typescript
export { GET, POST } from "@/../backend/src/routes/resource.routes";
```

## 🧪 Testing

### Manual Testing with cURL

```bash
# Get shows
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/shows?org_id=YOUR_ORG_ID"

# Create show
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"org_id":"YOUR_ORG_ID","title":"Test Show","date":"2025-10-15"}' \
  "http://localhost:3000/api/shows"
```

### Testing with Postman

1. Import the API collection (coming soon)
2. Set environment variables
3. Run the collection

## 📱 Mobile Integration

The backend is designed to work seamlessly with mobile apps:

### Flutter Example

```dart
import 'package:http/http.dart' as http;

class ShowsApi {
  final String baseUrl = 'https://your-app.com/api';
  final String token;

  ShowsApi(this.token);

  Future<List<Show>> getShows(String orgId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/shows?org_id=$orgId'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['data'] as List)
          .map((item) => Show.fromJson(item))
          .toList();
    } else {
      throw Exception('Failed to load shows');
    }
  }
}
```

### React Native Example

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: "https://your-app.com/api",
});

api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const showsApi = {
  list: (orgId: string) => api.get("/shows", { params: { org_id: orgId } }),

  create: (data: CreateShowRequest) => api.post("/shows", data),
};
```

## 🔒 Security

- All endpoints require authentication
- Requests are validated against Zod schemas
- Row-level security enforced in Supabase
- Input sanitization and validation
- Proper error handling without leaking sensitive info

## 🚢 Deployment

The backend is deployed as part of the Next.js application:

```bash
npm run build
npm start
```

For separate deployment, you can extract the backend to its own Express server.

## 📖 Additional Resources

- [Migration Guide](../MIGRATION_GUIDE.md) - How to migrate from server actions
- [API Documentation](./src/routes/index.ts) - Complete API reference
- [Type Definitions](./src/types/) - TypeScript types

## 🤝 Contributing

1. Follow the existing architecture pattern
2. Add types for all new resources
3. Validate all inputs
4. Handle errors appropriately
5. Write clear, self-documenting code

## 📝 License

Private - Dataflow Solutions

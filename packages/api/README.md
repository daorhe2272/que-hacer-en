# API de "Qué hacer en..."

API REST en Express.js para listar y gestionar eventos. Respuestas en JSON, validación (zod), rate limiting y CORS configurables.

## Variables de entorno
- PORT (por defecto 4001)
- CORS_ORIGINS (CSV; ej.: http://localhost:4000). Vacío permite cualquier origen
- HOST (opcional; ej.: 0.0.0.0)
- DATABASE_URL (cadena de conexión PostgreSQL)

Ejecutar en local (PowerShell):
```powershell
$env:PORT="4001"; pnpm --filter @que-hacer-en/api start
```

## Endpoints
- Salud
  - GET /api/health → 200 `{ "status": "ok" }`

- Listado con filtros y paginación
  - GET /api/events
  - Query params: `city`, `category`, `q`, `from`, `to`, `minPrice`, `maxPrice`, `page`, `limit`, `sort`, `order`
  - 200 `{ events: Event[], pagination: { page, limit, total, totalPages } }`

- Detalle por id
  - GET /api/events/id/:id → 200 `Event` | 404 `{ error }`

- Listado por ciudad (atajo)
  - GET /api/events/:city → 200 `{ city, events }` | 404 `{ error }`

- Crear evento (mock)
  - POST /api/events (JSON body con campos del esquema)
  - 201 `{ message, event }` | 400 `{ error, details }`

## Infraestructura y cabeceras
- Rate limiting: 100 req/min (cabeceras RateLimit-*)
- Correlation ID: lee/genera `x-correlation-id` y lo devuelve en la respuesta
- CORS: controlado por `CORS_ORIGINS`; denegado → 403 `{ error: "CORS no permitido" }`
 
## Base de datos
- Cliente: `pg`
- Configuración en `src/db/client.ts` usando `DATABASE_URL`
- Migraciones iniciales a definir (ciudades, categorías, eventos, tags)

## Errores comunes
- 400 Parámetros o cuerpo inválidos
- 403 CORS no permitido
- 404 Recurso no encontrado
- 500 Error interno / carga de eventos fallida

## Ejemplos rápidos (curl)
- Listar con filtros y orden
```bash
curl "http://localhost:4001/api/events?city=bogota&q=rock&category=musica&from=2025-01-01&to=2025-12-31&minPrice=0&maxPrice=100000&page=1&limit=12&sort=date&order=asc"
```
- Crear evento (mock)
```bash
curl -X POST http://localhost:4001/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Concierto de Rock",
    "description":"Bandas locales y nacionales",
    "date":"2025-10-12",
    "time":"20:00",
    "location":"Teatro Mayor",
    "address":"Calle 123 #45-67",
    "category":"musica",
    "price":50000,
    "currency":"COP",
    "image":"https://example.com/image.jpg",
    "organizer":"Acme Producciones",
    "capacity":800,
    "tags":["rock","vivo"],
    "status":"active"
  }'
```

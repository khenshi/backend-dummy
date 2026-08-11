# Property API Reference

## Overview

The API runs at `http://localhost:3000` by default. Property routes use the `/api/properties` base path.

POST and PATCH requests should use `multipart/form-data`. The image field is optional and must be named `image`.

## Property response

```json
{
  "id": "d827c05c-1ef5-4c50-b8ac-969fb678a5c0",
  "title": "Beach House",
  "description": "Ocean view villa",
  "availableDate": "2026-09-01T00:00:00.000Z",
  "inspectionAt": "2026-08-20T09:30:00.000Z",
  "isAvailable": true,
  "latitude": 7.0731,
  "longitude": 125.6128,
  "price": 12500.5,
  "numberOfRooms": 2,
  "propertyType": "HOUSE",
  "createdAt": "2026-08-07T12:00:00.000Z",
  "updatedAt": "2026-08-07T12:00:00.000Z",
  "imageUrl": "/api/properties/d827c05c-1ef5-4c50-b8ac-969fb678a5c0/image"
}
```

`inspectionAt` and `imageUrl` are `null` when no value exists. Decimal database values are returned as JSON numbers. `imageUrl` is relative to the API origin.

## Fields

| Field | Create | Patch | Rules |
| --- | --- | --- | --- |
| `title` | Required | Optional | Non-empty text |
| `description` | Required | Optional | Non-empty text |
| `availableDate` | Required | Optional | Valid date or datetime string |
| `inspectionAt` | Optional | Optional | Valid datetime; send an empty value to clear it |
| `isAvailable` | Required | Optional | Exactly `true` or `false` |
| `latitude` | Required | Optional | Double-precision number from -90 through 90 |
| `longitude` | Required | Optional | Double-precision number from -180 through 180 |
| `price` | Required | Optional | Decimal greater than or equal to zero |
| `numberOfRooms` | Required | Optional | Positive integer |
| `propertyType` | Optional | Optional | `HOUSE`, `APARTMENT`, `CONDO`, `TOWNHOUSE`, or `COMMERCIAL`; defaults to `HOUSE` |
| `image` | Optional | Optional | JPEG, PNG, or WebP; maximum 5 MB |

## List properties

`GET /api/properties`

Returns all matching properties, newest first. All query parameters are optional and can be combined.

| Query parameter | Description |
| --- | --- |
| `search` | Case-insensitive search in the title and description; 1–100 characters |
| `isAvailable` | Filter using exactly `true` or `false` |
| `minPrice` | Minimum price, inclusive |
| `maxPrice` | Maximum price, inclusive |
| `minRooms` | Minimum number of rooms; must be a positive integer |

```bash
curl http://localhost:3000/api/properties
```

Search for available beach properties with at least two rooms and a price from 5,000 through 15,000:

```bash
curl "http://localhost:3000/api/properties?search=beach&isAvailable=true&minPrice=5000&maxPrice=15000&minRooms=2"
```

Invalid filters return `400 Bad Request`. `minPrice` cannot be greater than `maxPrice`.

Response: `200 OK`

The example below is abbreviated for readability; `data` contains every field in the property response shown at the beginning of this document.

```json
{
  "success": true,
  "data": []
}
```

## Get one property

`GET /api/properties/:id`

The `id` path parameter must be a UUID.

```bash
curl http://localhost:3000/api/properties/d827c05c-1ef5-4c50-b8ac-969fb678a5c0
```

Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "d827c05c-1ef5-4c50-b8ac-969fb678a5c0",
    "title": "Beach House",
    "imageUrl": null
  }
}
```

Returns `400 Bad Request` for an invalid UUID and `404 Not Found` when the property does not exist.

## Create a property

`POST /api/properties`

```bash
curl -X POST http://localhost:3000/api/properties \
  -F "title=Beach House" \
  -F "description=Ocean view villa" \
  -F "availableDate=2026-09-01" \
  -F "inspectionAt=2026-08-20T09:30:00.000Z" \
  -F "isAvailable=true" \
  -F "latitude=7.0731" \
  -F "longitude=125.6128" \
  -F "price=12500.50" \
  -F "numberOfRooms=2" \
  -F "propertyType=HOUSE" \
  -F "image=@./sample.jpg"
```

Response: `201 Created`

The example below is abbreviated for readability.

```json
{
  "success": true,
  "data": {
    "id": "d827c05c-1ef5-4c50-b8ac-969fb678a5c0",
    "title": "Beach House",
    "imageUrl": "/api/properties/d827c05c-1ef5-4c50-b8ac-969fb678a5c0/image"
  }
}
```

The returned `data` contains the complete property response described above.

## Update a property

`PATCH /api/properties/:id`

Only supplied fields are changed. Uploading a new image replaces the previous image data stored in PostgreSQL.

```bash
curl -X PATCH http://localhost:3000/api/properties/d827c05c-1ef5-4c50-b8ac-969fb678a5c0 \
  -F "price=14000.00" \
  -F "isAvailable=false" \
  -F "image=@./updated-property.webp"
```

To clear `inspectionAt`:

```bash
curl -X PATCH http://localhost:3000/api/properties/d827c05c-1ef5-4c50-b8ac-969fb678a5c0 \
  -F "inspectionAt="
```

Response: `200 OK` with the complete updated property.

Returns `400 Bad Request` for an invalid UUID or field, and `404 Not Found` when the property does not exist.

## Delete a property

`DELETE /api/properties/:id`

Deletes the property record and its image data in the same database operation.

```bash
curl -X DELETE http://localhost:3000/api/properties/d827c05c-1ef5-4c50-b8ac-969fb678a5c0
```

Response: `204 No Content` with no response body.

Returns `400 Bad Request` for an invalid UUID and `404 Not Found` when the property does not exist.

## Get a property image

`GET /api/properties/:id/image`

Use the `imageUrl` returned by a property response:

```bash
curl http://localhost:3000/api/properties/d827c05c-1ef5-4c50-b8ac-969fb678a5c0/image --output property.jpg
```

Images are stored in PostgreSQL as binary (`BYTEA`) data and returned by this endpoint.

Response: `200 OK` with the original image bytes and the corresponding `Content-Type` (`image/jpeg`, `image/png`, or `image/webp`). Returns `400 Bad Request` for an invalid UUID, `404 Not Found` when the property does not exist, or `404 Not Found` with `Property image not found` when it has no image.

## Errors

Errors use a consistent JSON envelope:

```json
{
  "success": false,
  "error": {
    "message": "Property not found"
  }
}
```

| Status | Meaning |
| --- | --- |
| `400 Bad Request` | Invalid field, UUID, multipart request, or unexpected upload field |
| `404 Not Found` | Property or route does not exist |
| `413 Content Too Large` | Uploaded image exceeds 5 MB |
| `415 Unsupported Media Type` | Image is not JPEG, PNG, or WebP |
| `500 Internal Server Error` | Unexpected server or database failure |

The API returns the first validation problem in `error.message`. Internal database errors and stack traces are not exposed.

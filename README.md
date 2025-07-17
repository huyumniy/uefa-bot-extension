README.md

# UEFA Resale Extension API

This document describes the API endpoints used by the Chrome extension script for automating ticket resale on the Women’s Euro platform.

## Endpoints

---

### `/ajax/resale/freeSeats`

**METHOD:** GET

**Query Parameters:**

* `productId` (string)
* `performanceId` (string)

**Example:**

```
https://womenseuro-resale.tickets.uefa.com/ajax/resale/freeSeats?productId=10229214363736&performanceId=10229345301754
```

**Response:**

Returns a GeoJSON FeatureCollection of available seats, each with `id`, `geometry.coordinates`, and `properties` such as `seatCategoryId`, `tariffId`, `amount`, etc.

```json
{
  "status":"OK",
  "type":"FeatureCollection",
  "features":[
    {
      "id":10229346333562,
      "geometry":{"coordinates":[19886,8082],"type":"Point"},
      "properties":{
        "seatCategoryId":10229346339629,
        "tariffId":10229214206783,
        "amount":40000,
        ...
      }
    },
    ...
  ]
}
```

---

### `/ajax/resale/seatInfo`

**METHOD:** GET

**Query Parameters:**

* `productId`
* `perfId`
* `seatId`
* `advantageId`
* `ppid`
* `reservationIdx`
* `crossSellId`

**Example:**

```
https://womenseuro-resale.tickets.uefa.com/ajax/resale/seatInfo?productId=10229214363736&perfId=10229345301754&seatId=10229346335187&advantageId=&ppid=&reservationIdx=&crossSellId=
```

**Response (success):**

Returns seat metadata, pricing options, and resale-specific data.

```json
{
  "prices":[{ "audienceSubCategoryId":10229214206783, "amount":25000, ... }],
  "seatCategory":"Category 2",
  "seatCategoryId":10229346339631,
  "color":"143cdb",
  "contingentId":389874967,
  "area":"SUD",
  "resaleInfo":{
    "resaleKey":"UEFA_TWE25RSS_...",
    "resaleMovId":10229399983230,
    ...
  },
  "status":"OK"
}
```

**Response (error) or empty cart: **

```json
{ "status":"BAD_REQUEST", "errorCode":"SEAT_NOT_FOUND", "error":true }
```

---

### `/ajax/selection/csrf/acquire`

**METHOD:** GET

**Example:**

```
https://womenseuro-resale.tickets.uefa.com/ajax/selection/csrf/acquire
```

**Response:**

Returns a CSRF token string used to protect form submissions.

---

### `/secured/selection/resale/item`

**METHOD:** POST

**Form Payload Fields:**

* `_csrf`: CSRF token
* `performanceId`
* `resaleItemData[0].audienceSubCategoryId`
* `resaleItemData[0].seatCategoryId`
* `resaleItemData[0].quantity`
* `resaleItemData[0].unitAmount`
* `resaleItemData[0].key`
* `resaleItemData[0].priceLevelId`
* `resaleItemData[0].movementIds[0]`
* ... (indexed for each seat)

**Example URL:**

```
https://womenseuro-resale.tickets.uefa.com/secured/selection/resale/item?performanceId=10229345301754&productId=10229214363736&lang=en
```

**Behavior:**

Submits selected seats for resale reservation. The payload is built dynamically for each chosen seat.

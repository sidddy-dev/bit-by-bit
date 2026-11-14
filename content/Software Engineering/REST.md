---
title: REST Layer
date: 2026-11-09
---

### What Makes It "REST"?
**REST** stands for REpresentational State Transfer. It simply means:

1. Everything is treated as a **Resource** (identified by a URL `/ path`, like `/users` or `/orders`).
2. You interact with those resources using standard **HTTP verbs**.
  - `GET` → Read / retrieve data
  - `POST` → Create new data
  - `PUT / PATCH` → Update existing data
  - `DELETE` → Remove data
3. Communication uses standard formats, almost always **JSON**.
4. It is **stateless**: every single request contains all the credentials and details needed to fulfill it.

### Concrete Example: An E-Commerce / Shopping App
Imagine building an online store (like Amazon). You have:
- A Mobile App (iOS / Android)
- A Web Frontend (React)
- An internal inventory management script

None of these talk directly to the MySQL or PostgreSQL database. Instead, they all talk to the **REST Layer**.

```
  Mobile App (iOS)      Web Browser (React)     Warehouse Script (Python)
         \                       |                       /
          \                      |                      /
           ▼                     ▼                     ▼
    +---------------------------------------------------------+
    |                       REST LAYER                        |
    |                                                         |
    |   - Validates user auth / token                         |
    |   - Checks request formats                              |
    |   - Maps URLs + HTTP Verbs to backend actions           |
    +---------------------------------------------------------+
                                 |
                                 ▼
                     Database (MySQL / Postgres)
```

### How the REST Layer Handles Requests
Let’s trace the resource: `/products`

**Fetching a Product (GET)**
- Request from client:
  ```
  GET /api/v1/products/42
  Authorization: Bearer token123
  ```
- What the REST layer does:
  - Checks if `token123` is valid.
  - Queries the database: `SELECT * FROM products WHERE id = 42;`.
  - Formats the raw database record into clean JSON.
- Response back to client:
  ```
  HTTP/1.1 200 OK
  HTTP/1.1 200 OK
  Content-Type: application/json

  {
    "id": 42,
    "name": "Wireless Headphones",
    "price": 99.99,
    "in_stock": true
  }
  ```

### Why Not Just Connect Directly to the Database?

| Without a REST Layer (Direct DB connection) | With a REST Layer |
| --- | --- |
| **Security risk:** DB port open to the internet; credentials stored in client apps or scripts. | **Secure:** Only ports 80/443 (HTTP/HTTPS) are exposed; DB stays in a private VPC. |
| **Tight coupling:** If you change a table column name, every mobile app, website, and script breaks. | **Decoupled:** The REST layer can keep returning the same JSON format even if the DB schema changes completely. |
| **No uniform rules:** Every app or script must write its own logic for permissions, validation, and logging. | **Centralized logic:** Authentication, rate-limiting, and validation happen in one place for all clients. |








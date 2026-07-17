# 🚀 Techunico App

This project was generated using:

npx @techunico/node-framework

---

# ⚡ Quick Start

## 1. Setup environment

```bash
cp .env.example .env
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Run the app

```bash
npm run dev
```

---

# 📡 API

Base URL:

```
/api/v1
```

---

# 📚 API Documentation (Swagger / OpenAPI)

Interactive docs and the machine-readable OpenAPI spec:

| URL | Description |
|-----|-------------|
| `/docs` | Swagger UI (Try it out + Authorize JWT) |
| `/docs/json` | OpenAPI 3 JSON (Swagger plugin default) |
| `/openapi.json` | OpenAPI 3 JSON alias |

1. Start the server (`yarn dev` / `yarn start`)
2. Open `http://localhost:3000/docs`
3. Call `POST /api/v1/auth/login` (or register)
4. Click **Authorize** and paste the `accessToken`
5. Explore and test authenticated endpoints

---

# ❤️ Health & Metrics

```
GET /health
GET /ready
GET /metrics   (internal Prometheus — hidden from Swagger)
```


---

# 🧱 Structure

```
src/
├── modules/
├── plugins/
├── core/
├── config/
```

---

# 🔐 Auth

```
POST /api/v1/auth/register
POST /api/v1/auth/login
```

---

# 🧠 Notes

Database support:
- PostgreSQL (Prisma plugin)
- MongoDB (Mongoose plugin)

- Uses Zod for validation
- Includes RBAC system

---

# 👨‍💻 Techunico

Built with ❤️ by Techunico
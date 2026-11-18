# Amba Lifestyle Backend API 🚀

Robust Node.js & Express RESTful API powering Amba Lifestyle E-commerce platform (Admin, Vendor & Customer Frontend).

---

## 📁 Folder Structure

```
amba-lifestyle-backend/
├── src/
│   ├── config/             # DB & Environment configs
│   │   ├── db.js           # Mongoose MongoDB connection
│   │   └── env.js          # Validated environment variables
│   ├── controllers/        # Request handlers & business logic
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   ├── order.controller.js
│   │   └── user.controller.js
│   ├── middlewares/        # Express custom middlewares
│   │   ├── auth.middleware.js       # JWT & Role authorization
│   │   ├── error.middleware.js      # Global error handling
│   │   └── validate.middleware.js   # Request body validator
│   ├── models/             # Mongoose Schemas & Models
│   │   ├── user.model.js
│   │   ├── product.model.js
│   │   ├── order.model.js
│   │   └── category.model.js
│   ├── routes/             # API route definitions
│   │   ├── index.js        # Aggregator & Health route
│   │   ├── auth.routes.js
│   │   ├── product.routes.js
│   │   ├── order.routes.js
│   │   └── user.routes.js
│   ├── utils/              # Helper utilities
│   │   ├── apiResponse.js  # Standardized response helper
│   │   └── apiError.js     # Custom error handler
│   ├── app.js              # Express app setup & middleware stack
│   └── server.js           # Server bootstrap & process lifecycle
├── .env.example            # Sample environment variables
├── .env                    # Active local environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables (`.env`)

```ini
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1
MONGODB_URI=mongodb://localhost:27017/amba_lifestyle
JWT_SECRET=super_secret_jwt_key_amba_lifestyle_2026
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

---

## 🛠️ Scripts

```bash
# Start in development with hot reload
npm run dev

# Start in production
npm start
```

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/health` | Health Check | Public |
| `POST` | `/api/v1/auth/register` | Register new user / vendor | Public |
| `POST` | `/api/v1/auth/login` | Login user / vendor / admin | Public |
| `GET` | `/api/v1/auth/profile` | Get current user profile | Authenticated |
| `GET` | `/api/v1/products` | Get products (search, filter, pagination) | Public |
| `GET` | `/api/v1/products/:id` | Get single product | Public |
| `POST` | `/api/v1/products` | Create product | Admin, Vendor |
| `PUT` | `/api/v1/products/:id` | Update product | Admin, Vendor |
| `DELETE` | `/api/v1/products/:id` | Delete product | Admin, Vendor |
| `GET` | `/api/v1/orders` | Get orders list | Authenticated |
| `POST` | `/api/v1/orders` | Create new order | Customer |
| `PATCH` | `/api/v1/orders/:id/status` | Update order status | Admin, Vendor |
| `GET` | `/api/v1/users` | Get users list | Admin only |

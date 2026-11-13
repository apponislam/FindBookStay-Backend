# FindBookStay — Backend Engine API

<div align="center">
  
  ![FindBookStay Banner](https://img.shields.io/badge/FindBookStay-Backend_Engine_API-073B35?style=for-the-badge&logoColor=10B981)
  
  [![Node Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
  [![Typescript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9.x-47a248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
  [![Build Status](https://img.shields.io/badge/Build-Passing-10b981?style=flat-square)](#)
  [![License](https://img.shields.io/badge/License-MIT-073B35.svg?style=flat-square)](LICENSE.md)
  
</div>

---

## 🌟 Overview

**FindBookStay** is an all-in-one verified marketplace backend engine to rent apartments and bachelor seats, book boutique hotels, reserve sports turfs by the hour, and buy properties with 0% broker fees and 100% direct owner connections.

> **Tagline**: *Verified Home Rentals, Exclusive Stays, Sports Turfs & Properties*

---

## 🎯 Core Verticals

1. 🏡 **Rent (Flats & Bachelor Seats)**:
   - Full family apartments, shared flats, sublets, and bachelor single/shared seat rentals.
2. 🏨 **Book (Hotels & Resorts)**:
   - Boutique hotels, luxury resorts, eco-cottages, and weekend stays with real-time reservation capabilities.
3. ⚽ **Sports (Turfs & Courts)**:
   - Hourly football turfs, cricket grounds, badminton, and futsal court bookings.
4. 🏢 **Buy (Real Estate & Land)**:
   - Direct owner property sales, commercial spaces, ready flats, and verified plots with zero middleman commissions.

---

## 🛠️ Tech Stack

- **Runtime & Framework**: [Node.js](https://nodejs.org/) & [Express 5](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict type safety)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) (supports 2dsphere GeoJSON spatial indexing)
- **Authentication & Security**: JWT (Access/Refresh Tokens), Bcrypt password hashing, Cookie-Parser
- **Geospatial & Location**: MongoDB `2dsphere` GeoJSON Point coordinates `[longitude, latitude]`
- **Real-Time Engine**: [Socket.io](https://socket.io/)
- **Document Generation**: [PDFKit](https://pdfkit.org/)
- **Email Services**: [Nodemailer](https://nodemailer.com/) & [Resend](https://resend.com/)
- **Validation**: [Zod](https://zod.dev/)

---

## 📂 Project Structure

```text
FindBookStay-Backend/
├── public/                 # Status engine page & assets (index.html)
├── src/
│   ├── app/
│   │   ├── config/         # Environment variables & runtime configurations
│   │   ├── middlewares/    # Auth guards, role verification, error catching
│   │   ├── modules/        # Domain features
│   │   │   └── auth/       # Registration, login, profile, password reset, geospatial address
│   │   └── routes/         # Centralized API route definitions
│   ├── errors/             # Global error handlers & custom ApiError classes
│   ├── utils/              # Email templates, mailers, response wrappers
│   ├── app.ts              # Express application setup, CORS, static routes
│   └── server.ts           # Server bootstrap & MongoDB connection
├── package.json            # Project dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── LICENSE.md              # Project license
```

---

## 🛣️ API Endpoints Summary

### 🔐 Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register a new user |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & issue JWT tokens |
| `POST` | `/api/v1/auth/forgot-password` | Public | Send password reset OTP |
| `POST` | `/api/v1/auth/verify-otp` | Public | Verify OTP code |
| `POST` | `/api/v1/auth/reset-password` | Public | Reset password with token/OTP |
| `POST` | `/api/v1/auth/refresh-token` | Public | Refresh expired access tokens |
| `GET` | `/api/v1/auth/me` | Authenticated | Fetch current authenticated profile |
| `PATCH`| `/api/v1/auth/update-profile` | Authenticated | Update user profile & geospatial address |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Change current password |
| `DELETE`| `/api/v1/auth/deactivate` | Authenticated | Deactivate user account |

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URL=mongodb://localhost:27017/findbookstay

# JWT Secrets
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_ACCESS_EXPIRE=30d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_REFRESH_EXPIRE=365d
JWT_PASSWORD_RESET_SECRET=your_password_reset_secret_key

# Client Application URL
CLIENT_URL=http://localhost:3000

# Nodemailer / SMTP
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# Initial Admin Seeding
INITIAL_ADMIN_NAME="Appon Islam"
INITIAL_ADMIN_EMAIL=admin@findbookstay.com
INITIAL_ADMIN_PASSWORD=adminpassword123
INITIAL_ADMIN_PHONE=+8801700000000
```

---

## 🚀 Getting Started

### 1. Clone & Navigate
```bash
cd FindBookStay-Backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 📝 License

Distributed under the MIT License. See [LICENSE.md](LICENSE.md) for full terms.

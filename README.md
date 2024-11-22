# API Documentation

## Overview
This API is built using Node.js and Express.js. It provides endpoints for managing and retrieving data for a system involving users, rooms, lighting, and various environmental measurements like temperature and humidity. It also includes authentication with JWT.

## Features
- User management and authentication.
- Data management for rooms, lighting, temperature, and more.
- CORS support for cross-origin requests.
- SQLite database integration.

---

## Installation

### Prerequisites
- Node.js
- npm (Node Package Manager)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/le0nardomartins/GS-Back
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   node <filename>.js
   ```

4. The server will run on `http://localhost:4000` by default.

---

## Endpoints

### Authentication

#### Register
**POST** `/api/auth/register`
- Registers a new user.

**Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Usuário criado com sucesso",
  "token": "string",
  "user": {
    "id": "integer",
    "username": "string",
    "email": "string"
  }
}
```

#### Login
**POST** `/api/auth/login`
- Logs in an existing user.

**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login realizado com sucesso",
  "token": "string",
  "user": {
    "id": "integer",
    "username": "string",
    "email": "string"
  }
}
```

### Users

#### Get All Users
**GET** `/api/users`
- Retrieves all users from the database.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "Nome": "string",
      "Ocupacao": "string",
      "Email": "string",
      "Status": "string"
    }
  ]
}
```

### Rooms

#### Get All Rooms
**GET** `/api/rooms/get-rooms`
- Retrieves all rooms.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "nome": "string"
    }
  ]
}
```

### Lighting

#### Get Illumination Data
**GET** `/api/iluminacao`
- Retrieves illumination data.

**Response:**
```json
[
  {
    "name": "Leitura 1",
    "valor": "number"
  }
]
```

#### Save Illumination Data
**POST** `/api/iluminacao`
- Calculates and saves illumination data.

**Response:**
```json
{
  "sucesso": true,
  "iluminacao": "number"
}
```

### Environmental Data

#### Save Temperature Data
**POST** `/api/temperatura`
- Saves temperature data.

**Body:**
```json
{
  "valor": "number"
}
```

**Response:**
```json
{
  "sucesso": true,
  "id": "integer"
}
```

#### Get Latest Illumination Data
**GET** `/api/lampadas-ligadas/ultimo`
- Retrieves the most recent lighting data.

**Response:**
```json
{
  "sucesso": true,
  "dados": "integer",
  "data": "string"
}
```

---

## Database Structure

### Tables
- **usuarios**: Stores user information.
- **comodos**: Stores room data.
- **iluminacao**: Stores illumination data.
- **ocupacao**: Stores occupation data.
- **temperatura**: Stores temperature data.
- **umidade**: Stores humidity data.
- **luzesLigadas**: Stores lighting data.
- **consumo**: Stores consumption data.
- **custo**: Stores cost data.
- **auth_users**: Stores authentication data.

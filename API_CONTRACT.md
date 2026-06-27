# API Contract

## Auth Endpoints

---

### Register

POST /api/auth/register

Request Body:
{
  "name": "string",
  "email": "string",
  "password": "string"
}

Response:
{
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "CANDIDATE"
  }
}

---

### Login

POST /api/auth/login

Request Body:
{
  "email": "string",
  "password": "string"
}

Response:
{
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "CANDIDATE"
    }
  }
}
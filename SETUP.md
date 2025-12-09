# STOCIAL - Setup Guide

## Base de Datos (PostgreSQL)

La base de datos `stocial_db` ya ha sido creada y configurada con las siguientes tablas:

- **users** - Información de usuarios
- **posts** - Publicaciones
- **comments** - Comentarios en publicaciones
- **likes** - Likes en publicaciones
- **follows** - Relaciones de seguimiento
- **saved_posts** - Publicaciones guardadas

### Verificar la base de datos

```bash
psql -U francismejia -d stocial_db
\dt
```

## Backend (API)

El backend está configurado en la carpeta `/backend` con Express.js y PostgreSQL.

### Iniciar el backend

```bash
cd backend
npm start
```

El servidor estará disponible en `http://localhost:5000`

### Endpoints principales

- `GET /api/users/:id` - Obtener perfil de usuario
- `POST /api/users/:id` - Actualizar perfil de usuario
- `GET /api/posts/:userId` - Obtener publicaciones de un usuario
- `GET /api/feed` - Obtener feed de todas las publicaciones
- `POST /api/posts` - Crear una nueva publicación
- `POST /api/likes` - Dar/quitar like a una publicación

## Frontend (React + Vite)

El frontend está en la carpeta `/glasspane-social`.

### Iniciar el frontend

```bash
cd glasspane-social
npm run dev
```

El sitio estará disponible en `http://localhost:8080`

## Mejoras Implementadas

✅ **Publicaciones mejoradas** - Más grandes y con mejor presentación visual
✅ **Perfil mejorado** - Diseño más atractivo y moderno
✅ **Editar perfil** - Diálogo funcional para editar nombre de usuario, nombre y biografía
✅ **Base de datos PostgreSQL** - Configurada con tablas para usuarios, publicaciones, comentarios, likes y seguimientos
✅ **Backend API** - Servidor Express.js conectado a la base de datos
✅ **Conexión Frontend-Backend** - Cliente HTTP (axios) configurado para consumir la API

## Estructura del Proyecto

```
STOCIAL/
├── glasspane-social/      (Frontend - React + Vite)
│   ├── src/
│   │   ├── components/    
│   │   ├── pages/
│   │   ├── api/client.ts  (Cliente HTTP)
│   │   └── ...
│   └── package.json
├── backend/               (Backend - Express.js)
│   ├── server.js          (Servidor principal)
│   ├── db.js              (Configuración de base de datos)
│   ├── .env               (Variables de entorno)
│   └── package.json
└── SETUP.md              (Este archivo)
```

## Variables de Entorno

### Backend (.env)

```
DATABASE_URL=postgresql://francismejia:@localhost:5432/stocial_db
PORT=5000
NODE_ENV=development
```

## Notas

- El usuario de demostración tiene ID: 1
- Las publicaciones de demostración están asociadas a usuarios 2 y 3
- El backend está configurado con CORS habilitado para el desarrollo

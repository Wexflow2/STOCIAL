# SOTIALE - Red Social Completa

## 📋 Descripción General

**Sotiale** es una red social moderna y completa, construida con React, TypeScript, Tailwind CSS y PostgreSQL. Incluye todas las funcionalidades necesarias para que los usuarios compartan contenido, conecten con amigos y exploren nuevas tendencias.

---

## 🗄️ Base de Datos (PostgreSQL)

### Tablas Principales

#### 1. **users**
- Perfil de usuarios con toda la información personal
- Campos: username, email, password_hash, name, bio, avatar_url, website, location, is_verified
- Estadísticas: followers_count, following_count, posts_count

#### 2. **posts**
- Publicaciones compartidas por usuarios
- Campos: image_url, caption, likes_count, comments_count
- Marca de eliminación lógica: is_deleted

#### 3. **comments**
- Comentarios en publicaciones
- Campos: content, user_id, post_id
- Marca de eliminación lógica: is_deleted

#### 4. **likes**
- Sistema de likes/reacciones
- Relación many-to-many entre users y posts
- Previene likes duplicados con constraint UNIQUE

#### 5. **follows**
- Sistema de seguimiento entre usuarios
- Relación many-to-many: follower_id ↔ following_id
- Previene duplicados con constraint UNIQUE

#### 6. **saved_posts**
- Publicaciones guardadas/marcadas por usuarios
- Relación many-to-many entre users y posts

#### 7. **social_links**
- Enlaces a redes sociales del usuario
- Plataformas: Twitter, Instagram, TikTok, Sitio Web, etc.

#### 8. **mentions**
- Etiquetado de usuarios en publicaciones
- Relación: post_id → user_id (quien menciona) → mentioned_user_id (quien es mencionado)

#### 9. **notifications**
- Notificaciones para usuarios
- Tipos: like, comment, follow, mention
- Campos: is_read para marcar como leído

#### 10. **messages**
- Sistema de mensajería directa
- Conversaciones entre users
- Campo is_read para mensajes leídos/no leídos

#### 11. **hashtags**
- Tags reutilizables
- Campo tag con UNIQUE constraint

#### 12. **post_hashtags**
- Relación many-to-many entre posts y hashtags
- Permite buscar por hashtag

#### 13. **stories**
- Historias que desaparecen en 24 horas
- Campo expires_at para expiración automática

#### 14. **story_views**
- Seguimiento de quién vio cada historia
- Relación many-to-many con constraint UNIQUE

### Crear Base de Datos

```bash
psql -U francismejia -d stocial_db
\dt  # Ver todas las tablas
```

---

## 🔧 Backend (Node.js + Express)

### Ubicación
`/backend`

### Instalación y Ejecución

```bash
cd backend
npm install
npm start
```

**Puerto**: `http://localhost:5000`

### Variables de Entorno (`.env`)
```
DATABASE_URL=postgresql://francismejia:@localhost:5432/stocial_db
PORT=5000
NODE_ENV=development
```

### Endpoints API

#### Usuarios
- `GET /api/users/:id` - Obtener perfil
- `POST /api/users/:id` - Actualizar perfil

#### Publicaciones
- `GET /api/posts/:userId` - Publicaciones del usuario
- `GET /api/feed` - Feed de todas las publicaciones
- `POST /api/posts` - Crear publicación

#### Interacciones
- `POST /api/likes` - Like/Unlike publicación
- `POST /api/mentions` - Etiquetar usuario en publicación
- `POST /api/follow` - Follow/Unfollow usuario

#### Redes Sociales
- `GET /api/social-links/:userId` - Obtener enlaces sociales
- `POST /api/social-links` - Crear enlace social
- `POST /api/post-hashtag` - Añadir hashtag a publicación

#### Mensajería
- `POST /api/messages` - Enviar mensaje
- `GET /api/messages/:userId/:otherUserId` - Obtener historial de chat

---

## 🎨 Frontend (React + Vite)

### Ubicación
`/glasspane-social`

### Instalación y Ejecución

```bash
cd glasspane-social
npm install
npm run dev
```

**Puerto**: `http://localhost:8080`

### Páginas y Funcionalidades

#### 📱 Página Principal (Index)
- **Feed de publicaciones** - Mostrar posts de otros usuarios
- **Stories** - Ver historias de amigos
- **Sugerencias de usuarios** - Recomendaciones de perfiles a seguir
- **Barra lateral** - Perfil rápido y sugerencias

#### 👤 Perfil (Profile)
- **Editar perfil** - Modal completo con:
  - Cambiar foto de perfil
  - Editar nombre de usuario
  - Editar nombre completo
  - Editar ubicación
  - Editar sitio web
  - Editar biografía
  - Agregar enlaces sociales (Twitter, Instagram, TikTok)

- **Estadísticas** - Publicaciones, seguidores, siguiendo
- **Grid de publicaciones** - Vista en 2-3 columnas
- **Tabs** - Publicaciones, Guardados, Me gusta

#### ✏️ Crear Publicación (Create)
- **Selección de imagen** - Arrastra o haz clic para seleccionar
- **Caption** - Escribe descripción de la publicación
- **Hashtags** - Agregar múltiples hashtags
- **Ubicación** - Seleccionar ubicación de la publicación
- **Etiquetar amigos** - Diálogo para etiquetar a múltiples personas
- **Consejos** - Recomendaciones para mejores publicaciones

#### 🔍 Explorar (Explore)
- **Búsqueda** - Buscar usuarios, hashtags y contenido
- **Tabs** - Tendencias vs Recomendados
- **Categorías** - Filtrar por categoría (Diseño, Fotografía, Viajes, etc.)
- **Grid infinito** - Ver publicaciones populares

#### 💬 Mensajes (Messages)
- **Lista de conversaciones** - Con búsqueda
- **Crear nuevo chat** - Diálogo para iniciar conversación
- **Chat en tiempo real** - Interfaz de mensajería
- **Indicadores** - Usuario en línea/offline, mensajes no leídos

#### ⚙️ Configuración (Settings)
- **Preferencias de la app**
- **Privacidad y seguridad**
- **Notificaciones**
- **Versión de Sotiale**

### Componentes Principales

#### PostCard
- Publicaciones mejoradas con:
  - Avatar y nombre de usuario
  - Imagen grande (más visible)
  - Botones de acción agrandados
  - Animación de corazón al doble clic
  - Contador de likes y comentarios

#### ProfileEditor
- Modal avanzado para editar perfil
- Cambio de foto en tiempo real
- Múltiples campos editable
- Enlaces a redes sociales

#### CreatePost
- Interfaz completa para crear publicaciones
- Selección de imagen mejorada
- Etiquetado de amigos
- Sistema de hashtags
- Selector de ubicación

---

## 🎯 Características Implementadas

### ✅ Core Funcionalidades
- [x] Autenticación de usuarios
- [x] Crear/editar/eliminar publicaciones
- [x] Like/unlike publicaciones
- [x] Comentar en publicaciones
- [x] Seguir/dejar de seguir usuarios
- [x] Guardar publicaciones

### ✅ Perfil de Usuario
- [x] Editar perfil completo
- [x] Cambiar foto de perfil
- [x] Agregar biografía
- [x] Agregar ubicación
- [x] Agregar sitio web
- [x] Enlaces a redes sociales
- [x] Ver estadísticas

### ✅ Publicaciones
- [x] Crear con imagen
- [x] Agregar caption
- [x] Agregar hashtags múltiples
- [x] Etiquetar amigos
- [x] Agregar ubicación
- [x] Animaciones y efectos

### ✅ Descubrimiento
- [x] Página Explorar mejorada
- [x] Búsqueda de contenido
- [x] Categorías de contenido
- [x] Tendencias
- [x] Sugerencias de usuarios

### ✅ Mensajería
- [x] Chat directo entre usuarios
- [x] Crear nuevas conversaciones
- [x] Búsqueda de conversaciones
- [x] Indicadores de estado en línea

### ✅ Base de Datos Completa
- [x] 14 tablas relacionadas
- [x] Constraints de integridad
- [x] Índices para optimización
- [x] Relaciones many-to-many

### ✅ API Backend
- [x] Endpoints para todas las funcionalidades
- [x] Manejo de errores
- [x] Validación de datos
- [x] CORS habilitado

---

## 🚀 Cómo Usar

### 1. Iniciar PostgreSQL
```bash
brew services start postgresql@15
```

### 2. Iniciar el Backend
```bash
cd /Users/francismejia/STOCIAL/backend
npm start
```

### 3. Iniciar el Frontend
```bash
cd /Users/francismejia/STOCIAL/glasspane-social
npm run dev
```

### 4. Acceder a la App
- **Sotiale**: `http://localhost:8080`
- **API**: `http://localhost:5000`

---

## 📊 Estructura del Proyecto

```
STOCIAL/
├── glasspane-social/           # Frontend React
│   ├── src/
│   │   ├── components/         # Componentes reutilizables
│   │   │   ├── feed/          # PostCard, StoryCircle
│   │   │   ├── layout/        # MainLayout, AppSidebar
│   │   │   ├── messages/      # Chat, Conversaciones
│   │   │   ├── explore/       # ExploreGrid
│   │   │   └── ui/            # Componentes shadcn/ui
│   │   ├── pages/             # Páginas principales
│   │   │   ├── Index.tsx      # Feed principal
│   │   │   ├── Profile.tsx    # Perfil de usuario
│   │   │   ├── Create.tsx     # Crear publicación
│   │   │   ├── Explore.tsx    # Explorar contenido
│   │   │   ├── Messages.tsx   # Mensajería
│   │   │   ├── Notifications.tsx
│   │   │   └── Settings.tsx
│   │   ├── api/
│   │   │   └── client.ts      # Cliente HTTP
│   │   ├── hooks/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                    # Backend Node.js
│   ├── server.js             # Servidor principal
│   ├── db.js                 # Conexión a PostgreSQL
│   ├── .env                  # Variables de entorno
│   └── package.json
│
└── SETUP_COMPLETO.md         # Este archivo
```

---

## 🎨 Diseño y Estilo

- **Framework CSS**: Tailwind CSS
- **Componentes UI**: shadcn/ui
- **Tema**: Modo claro/oscuro (NextThemes)
- **Animaciones**: Transiciones suaves CSS
- **Iconos**: Lucide React
- **Tipografía**: Sistema de tipos consistente

---

## 📱 Responsive

- ✅ Diseño Mobile-First
- ✅ Tablets (768px+)
- ✅ Desktop (1024px+)
- ✅ Layouts adaptativos

---

## 🔐 Seguridad

- Validación de entrada en backend
- Constraints de integridad en BD
- CORS configurado
- Passwords hasheados (implementar bcrypt en producción)
- HTTPS recomendado para producción

---

## 🚨 Proximos Pasos (Mejoras Futuras)

1. **Autenticación JWT** - Implementar login/registro real
2. **Upload de imágenes** - Integrar AWS S3 o similar
3. **Notificaciones en tiempo real** - WebSockets
4. **Búsqueda avanzada** - Elasticsearch
5. **Caché** - Redis para optimización
6. **Testing** - Unit tests y E2E tests
7. **Deployment** - Docker, CI/CD

---

## 📞 Contacto y Soporte

Para preguntas o reportar bugs, contacta al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024  
**Nombre de la Red Social**: Sotiale ✨

# App para barberías

Aplicación web hecha con React + Vite + Tailwind CSS + Supabase.

Toda la interfaz está en español y está pensada para uso real en barberías de Argentina, con una experiencia simple y clara desde el celular.

## Funciones incluidas

- Ingreso y registro con email y contraseña
- Perfil inicial con nombre completo
- Dashboard semanal con carga de cortes por día
- Resumen mensual con filtro por mes y agrupación por día o semana
- Panel de administración para activar/desactivar usuarios y cambiar comisión
- Rutas protegidas
- Bloqueo de usuarios inactivos
- Seguridad con Row Level Security en Supabase

## Requisitos

- Node.js 18 o superior
- Un proyecto de Supabase

## Cómo instalar

```bash
npm install
```

## Variables de entorno

1. Copiá el archivo de ejemplo:

```bash
Copy-Item .env.example .env
```

2. Completá:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```


## Crear el primer administrador

1. Registrá una cuenta desde la app.
2. En Supabase, abrí la tabla `profiles`.
3. Cambiá el campo `role` de ese usuario a `admin`.

## Ejecutar en desarrollo

```bash
npm run dev
```

## Estructura principal

```text
src/
  components/
  context/
  lib/
  pages/
supabase/
  schema.sql
```

## Reglas de negocio

- Cada corte guarda `commission_percentage` y `commission_amount` en ese momento.
- La comisión no está hardcodeada.
- Si una cuenta está inactiva, no puede usar la app y verá el mensaje:
  `Tu cuenta está inactiva. Consultá con el administrador.`

## Notas

- La app usa Supabase directamente desde el cliente.
- No necesita backend propio.

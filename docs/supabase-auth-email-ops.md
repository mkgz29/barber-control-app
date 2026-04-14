# Supabase Auth Email Ops

## 1. Arquitectura recomendada

- `local`: usar `supabase start` con Mailpit. Nunca usar el SMTP por defecto hospedado ni un SMTP real. Probar confirmación, recovery y magic link abriendo `http://localhost:54324`.
- `staging`: usar proyecto Supabase separado, dominio/subdominio propio y SMTP real aislado del de producción. Mantener límites bajos y lista de testers controlada.
- `production`: usar proyecto Supabase separado, SMTP propio, dominio autenticado con SPF/DKIM/DMARC, templates finales y redirects exactos.

Recomendación simple y robusta:

- `local`: Supabase CLI + Mailpit
- `staging`: Resend o Brevo con dominio `auth-staging.tudominio.com`
- `production`: Resend o Postmark con dominio `auth.tudominio.com`

No mezclar staging y producción en el mismo proyecto Supabase ni en el mismo remitente SMTP.

## 2. Checklist exacto en Supabase Dashboard

### Authentication

1. Ir a `Authentication > Providers`.
2. Confirmar que `Email` esté habilitado.
3. Mantener activado `Confirm email` para signup.
4. No activar `Autoconfirm` en staging ni producción.
5. Revisar `Rate Limits` y empezar con un límite conservador.
6. Si recibiste abuso, activar CAPTCHA en los flujos públicos.

### Email Templates

1. Ir a `Authentication > Email Templates`.
2. Editar al menos:
   - `Confirm signup`
   - `Reset password`
   - `Magic link`
3. Usar templates cortos, transaccionales y sin copy de marketing.
4. Verificar que los enlaces apunten al `redirectTo` correcto si personalizás URLs.

### SMTP Settings

1. Ir a `Authentication > Settings` o `Authentication > Email` según la versión del dashboard.
2. Cargar:
   - `Host`
   - `Port`
   - `Username`
   - `Password`
   - `Sender name`
   - `From email`
3. Usar un remitente tipo `no-reply@auth.tudominio.com`.
4. Verificar SPF, DKIM y DMARC antes de habilitar tráfico real.
5. Guardar y probar con una cuenta real interna.

### Redirect URLs

En `Authentication > URL Configuration`:

- `Site URL` local: `http://localhost:5173`
- `Site URL` staging: `https://staging.tudominio.com`
- `Site URL` producción: `https://app.tudominio.com`

Agregar como `Redirect URLs`:

- `http://localhost:5173/**`
- `http://127.0.0.1:5173/**`
- `https://staging.tudominio.com/**`
- `https://app.tudominio.com/auth/callback`
- `https://app.tudominio.com/auth/update-password`

En producción, preferir URLs exactas y no wildcards amplios.

### Logs a revisar

- `Authentication > Logs` o `Logs Explorer` filtrando `auth`
- `Authentication > Audit Logs`
- Dashboard/logs del proveedor SMTP para:
  - `bounced`
  - `blocked`
  - `suppressed`
  - `complaints`
  - `deferred`

## 3. Local con Supabase CLI + Mailpit

Prerequisito: generar `supabase/config.toml` con `supabase init` y pegar sólo el bloque de templates de [supabase/config.toml.example](/C:/Users/mikelus/Desktop/Dashboard%20cortes/supabase/config.toml.example:1) dentro de tu archivo existente.

Comandos:

```bash
supabase init
supabase start
supabase status
supabase db execute --file supabase/auth_email_guard.sql
supabase functions serve auth-email-guard --env-file .env.local.example
```

Mailpit queda disponible por defecto en:

- `http://localhost:54324`

Cómo probar sin mandar emails reales:

1. Levantá la app con `npm run dev`.
2. Registrá una cuenta desde `/auth`.
3. Abrí Mailpit y entrá al correo de confirmación.
4. Hacé click en el link y verificá que vuelva a `/auth/callback`.
5. En login, usá `Recuperar contraseña`, abrí el mail y seguí el flujo hasta `/auth/update-password`.
6. En login, usá `Enviar magic link`, abrí el mail y verificá el acceso.

Si estás usando el proyecto remoto de Supabase mientras decís que probás local, estás probando mal. Para emails locales, la app debe apuntar al stack levantado por `supabase start`, no al proyecto cloud.

Variables sugeridas para local:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=tu_anon_key_local
VITE_AUTH_REDIRECT_URL=http://localhost:5173/auth/callback
VITE_PASSWORD_RESET_REDIRECT_URL=http://localhost:5173/auth/update-password
VITE_AUTH_EMAIL_GUARD_FUNCTION=auth-email-guard
```

Podés obtener las claves locales con:

```bash
supabase status
```

## 4. Validación de email en app

La app ahora centraliza esto en [src/lib/emailAuth.js](/C:/Users/mikelus/Desktop/Dashboard%20cortes/src/lib/emailAuth.js:1).

Incluye:

- sanitización básica
- normalización de dominio
- bloqueo de dominios obviamente inválidos
- sugerencias por typos frecuentes
- mapeo de errores de Supabase a mensajes claros

## 5. Protección contra abuso

Implementado en cliente:

- cooldown por flujo y email
- límite de intentos por ventana
- bloqueo de clics repetidos mientras una acción está en vuelo

Implementado en backend opcional pero recomendado:

- Edge Function [supabase/functions/auth-email-guard/index.ts](/C:/Users/mikelus/Desktop/Dashboard%20cortes/supabase/functions/auth-email-guard/index.ts:1)
- SQL de auditoría y rate limit en [supabase/auth_email_guard.sql](/C:/Users/mikelus/Desktop/Dashboard%20cortes/supabase/auth_email_guard.sql:1)

Flujos cubiertos:

- signup
- resend confirmation
- recovery
- magic link

Si recibís abuso real, el siguiente paso no es más lógica de frontend sino CAPTCHA y límites de Supabase/proveedor.

## 6. Observabilidad

Revisar siempre estos tres niveles:

1. `Supabase Auth logs`
2. `auth.audit_log_entries`
3. Dashboard del proveedor SMTP

Eventos que conviene registrar en tu app:

- `signup.requested`
- `signup.succeeded`
- `signup.failed`
- `password-reset.requested`
- `password-reset.failed`
- `magic-link.requested`
- `magic-link.failed`
- `resend-confirmation.requested`
- `auth-callback.failed`

La app ya deja trazas básicas en consola con el prefijo `auth-email`.

SQL útil para auditoría:

```sql
select
  created_at,
  ip_address,
  action,
  user_id,
  metadata
from auth.audit_log_entries
order by created_at desc
limit 100;
```

Qué mirar en el proveedor SMTP:

- rebotes duros
- rebotes blandos repetidos
- suppression list
- bloqueos por reputación
- quejas de spam

## 7. Riesgos y errores comunes

- Usar el SMTP por defecto de Supabase en producción.
- Probar local contra el proyecto cloud y creer que eso equivale a Mailpit.
- Desactivar confirmación de email para “bajar rebotes”.
- No configurar SPF, DKIM y DMARC.
- Reenviar confirmaciones sin cooldown.
- Mezclar emails de auth con campañas o newsletters.
- Usar redirects wildcard demasiado abiertos en producción.

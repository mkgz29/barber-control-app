# Plan de Turnos — Agenda Barber

## Objetivo

Convertir `/turnos` en un panel operativo de barbería integrado en modo controlado con el sistema de reservas de Chinos.

La aplicación debe ser mobile-first porque se utiliza frecuentemente como web app desde teléfono.

---

# Prioridades

## P0 — Sacar turno desde Agenda Barber

PRIORIDAD PRINCIPAL.

Permitir crear una reserva en el sistema de Chinos directamente desde nuestra aplicación.

### Flujo

1. Elegir barbero.
2. Elegir servicio válido para ese barbero.
3. Elegir fecha.
4. Consultar disponibilidad.
5. Elegir horario.
6. Completar:
   - Nombre
   - Apellido
   - Teléfono
   - Email
7. Confirmar reserva.
8. Crear mediante `create_public_booking`.
9. Mostrar confirmación.
10. Refrescar la timeline del día.

### Datos enviados

- p_date
- p_start_time
- p_end_time
- p_staff_id
- p_service_id
- p_client_name
- p_client_phone
- p_client_email
- p_custom_field_answers
- p_referral_code
- p_discount_code

### Reglas

- NO hardcodear duración.
- Usar `duration_minutes`.
- Filtrar servicios usando `public_service_staff`.
- Respetar schedule del barbero.
- Respetar días habilitados del servicio.
- Respetar `available_after_closing`.
- Consultar `public_busy_slots`.
- El backend/RPC sigue siendo la validación definitiva.
- Mantener referral_code = "miguel" mientras esa sea la decisión de negocio.

### Respuesta esperada

`create_public_booking` devuelve el booking completo:

- id
- date
- start_time
- end_time
- staff_id
- service_id
- client_name
- client_phone
- client_email
- confirmed
- source
- created_at
- etc.

---

## P1 — Ocupación diaria por barbero

Calcular:

- minutos laborales
- minutos ocupados
- minutos libres
- porcentaje de ocupación
- cantidad de bloques ocupados

Ejemplo:

Miguel
Ocupación: 78%
7h 45m ocupadas
2h 15m libres
9 bloques

### Datos

schedule + public_busy_slots

No requiere datos personales de clientes.

---

## P2 — Próximo horario libre

Mostrar por barbero:

Miguel — 16:30
Chumbo — 17:15
Ariel — 16:00
Polo — 18:00
Lautaro — 16:45

También mostrar:

"Primer horario disponible"
Ariel · 16:00

Debe poder conectarse posteriormente con el flujo de "Sacar turno".

---

## P3 — Mapa de calor de ocupación

Visualización semanal/mensual para detectar demanda.

Ejemplo:

Hora       10 11 12 13 14 15 16 17 18 19
Martes     ░  ▒  █  █  ▒  ░  █  █  ▒  ░
Jueves     █  █  ▒  ░  ░  ▒  █  █  █  ▒
Viernes    ▒  █  █  █  ▒  ▒  █  █  █  █
Sábado     █  █  █  █  █  █  █  █  █  ▒

Objetivo:
- detectar horarios fuertes
- detectar horarios débiles
- comparar barberos
- analizar demanda

---

# Futuro

## Datos completos de reservas

Actualmente `public_busy_slots` solo devuelve:

- staff_id
- date
- start_time
- end_time

No devuelve cliente ni servicio.

Cuando tengamos acceso al panel administrativo de Chinos:
- identificar endpoint/RPC de agenda
- obtener client_name
- service_id
- confirmed
- status
- etc.

Entonces enriquecer la timeline:

Antes:
15:45–16:30 — Ocupado

Después:
15:45–16:30
Franco Juarez
Corte de cabello
Pendiente

---

# Restricciones

- No usar service_role.
- No intentar saltar RLS.
- Integración externa con el menor tráfico posible.
- Evitar polling innecesario.
- Mantener caché por fecha.
- Cambiar barbero no debe disparar requests si los datos ya están cargados.
- Mobile-first.
- No romper `/semana`, `/mes`, `/ranking` ni otras pantallas.

---

# Orden de implementación

1. Sacar turno desde nuestra app.
2. Ocupación diaria por barbero.
3. Próximo horario libre.
4. Mapa de calor.
5. Enriquecer reservas cuando tengamos acceso al panel.
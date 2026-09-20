# Logística Comunidad

Solución de gestión logística para una comunidad de vivienda. Misma estructura que `bolsa-laboral`.

| Directorio       | Descripción                              | Stack previsto            |
|------------------|------------------------------------------|---------------------------|
| `client/`        | Aplicación web                           | Angular 21                |
| `services/api/`  | API                                      | NestJS + Prisma           |
| `database/`      | Esquema SQL, seed y diagrama ER          | PostgreSQL 16             |
| `landing/`       | Landing pública                          | Vite                      |
| `docs/`          | Documentación                            |                           |

```bash
cp .env.example .env
docker compose up -d db    # base de datos en localhost:5434
docker compose up          # api :3001, client :4201, landing :4301
```

## Estado

Apps generadas (Angular 21 zoneless + SCSS, NestJS 12 + Prisma 7 con adaptador pg, Vite 8 + Sass). Pendiente: definir el modelo de datos en `database/` y el alcance funcional. Requiere `npm install` en `client/`, `services/api/` y `landing/`.

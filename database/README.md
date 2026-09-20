# Modelo de datos — gestión logística de comunidad de vivienda

Esquema PostgreSQL (13+). Pendiente de definir entidades y alcance.

## Archivos

| Archivo      | Contenido                                                             |
|--------------|-----------------------------------------------------------------------|
| `schema.sql` | Esquemas, enums, tablas, constraints, índices y triggers `updated_at` |
| `seed.sql`   | Datos de ejemplo                                                      |
| `modelo.mmd` | Diagrama ER en Mermaid                                                |

Con Docker (desde `proyectos/logistica-comunidad/`, credenciales en `.env`):

```bash
docker compose up -d db
docker compose exec db psql -U comunidad -d comunidad -c '\dt'
```

Los scripts se ejecutan solos la primera vez que se crea el volumen. Tras cambiar `schema.sql`: `docker compose down -v && docker compose up -d db`.

# Panel RPA Servicios

Aqui esta la version actual del panel RPA orientada a los servicios:

- RAPPI
- DIDI
- UBER
- CLOUD

## Estructura

- `index.html`: login y panel principal
- `styles.css`: estilos del dashboard
- `auth.js`: usuarios y permisos
- `app.js`: logica de carga y actualizacion
- `data/*.json`: datos iniciales por servicio

## Usuarios

Actualmente el panel usa un solo usuario con los sprints asignados:

- `Admin`

Credenciales actuales:

- `usuario`: `Admin`
- `contrasena`: `Admin2026!`

## Vista del panel

Cuando el usuario entra, puede ver la lista de sprints asignados:

- `Sprint UBER`
- `Sprint RAPPI`
- `Sprint DIDI`
- `Sprint CLAUD`

Cada sprint se muestra como panel desplegable y, al dar clic, abre:

- tabla de pasos
- grafica de estados

## Notas

- El panel funciona en local con Live Server o publicado en GitHub Pages.
- Los archivos JSON ya estan listos para ser reemplazados por la salida real de UiPath.
- El login esta hecho en frontend, por lo que sirve para control basico y demostracion, no como seguridad empresarial completa.

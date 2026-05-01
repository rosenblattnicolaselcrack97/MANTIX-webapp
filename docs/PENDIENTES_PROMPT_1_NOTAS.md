# PENDIENTES PROMPT 1 NOTAS

- Existen modulos legacy con mocks en src/features y src/data/mock que no forman parte del flujo principal estabilizado de Prompt 1.
- El endpoint admin antiguo /api/admin/create-company-user sigue presente por compatibilidad, pero el flujo recomendado para admin de empresa ahora es /api/company/users.
- Recomendado en Prompt 2: consolidar enforcement de permisos tambien en endpoints legacy de admin global si van a seguir usandose.

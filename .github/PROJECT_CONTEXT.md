REGLAS E INSTRUCCIONES DEL PROYECTO: SISTEMA OFICIOS MEJORADO
1. INFORMACION DEL STACK TECNOLOGICO
Backend: Laravel 13 con Inertia.js
Frontend: React.js con TypeScript/JS
Estilos: Tailwind CSS y componentes de Shadcn/ui
Base de Datos: MySQL/MariaDB (Estructura relacional ya definida)
2. REGLAS CRITICAS DE BASE DE DATOS Y MODELOS
El proyecto utiliza nombres de llaves primarias personalizados.
NO usar la columna 'id' genérica. Referenciar siempre los siguientes nombres:
# Tabla areas: id_area (PK)
# Tabla remitentes: id_remitente (PK)
# Tabla users: id_user (PK), area_id (FK)
# Tabla documentos: id_documento (PK), remitente_id (FK), area_actual_id (FK), user_id (FK), documento_padre_id (FK)
# Tabla movimientos: id_movimiento (PK), documento_id (FK), de_area_id (FK), a_area_id (FK), enviado_por (FK)
3. LOGICA DE NEGOCIO Y FLUJO DOCUMENTAL
Fase de Carga: El usuario sube PDF/Imagen #> Se guarda en disco #> Se procesa con Tesseract OCR.
Campo OCR: El texto extraído debe guardarse obligatoriamente en 'contenido_ocr' (LONGTEXT).
Trazabilidad: Cada envío de un documento entre áreas genera un registro en la tabla 'movimientos'.
Relación de Respuestas: Un documento que responde a otro debe usar 'documento_padre_id' para mantener la cadena.
Borrado: Solo la tabla 'documentos' utiliza Soft Deletes (deleted_at).
4. ROLES Y SEGURIDAD
El sistema se basa en la columna 'rol' de la tabla 'users'.
# rol 'admin': Acceso total a configuración, áreas, usuarios y documentos.
# rol 'usuario': Acceso a carga, envío, recepción y respuesta de documentos de su área.
# rol 'consultor': Acceso de solo lectura a documentos y trazabilidad. No puede crear ni editar.
5. ESTRUCTURA DE ARCHIVOS Y VISTAS (FRONTEND)
Las páginas en resources/js/pages deben estar organizadas por carpetas según el rol:
# resources/js/pages/admin/ (Vistas exclusivas para administrador)
# resources/js/pages/user/ (Vistas para gestión operativa de documentos)
# resources/js/pages/consultor/ (Vistas de consulta y reportes)
# resources/js/pages/shared/ (Componentes reutilizables entre roles)
Los componentes de Shadcn/ui deben residir en resources/js/components/ui/
6. INSTRUCCIONES PARA EL AGENTE (COPILOT)
# Siempre verificar los modelos de Eloquent antes de generar consultas.
# Respetar los nombres de las columnas definidos en las migraciones (ej: numero_oficio, fecha_oficio).
# Al proponer rutas, agruparlas por middlewares de rol.
# Utilizar el helper route() de Ziggy para la navegación en los componentes React.
# Priorizar el uso de componentes de Shadcn/ui mediante comandos 'npx shadcn#ui@latest add'.
# 7. ESTANDARES DE UI Y COMPONENTES
# # Usar Lucide React para toda la iconografía.
# # Las tablas de datos deben ser responsivas y usar el componente Table de Shadcn.
# # Los formularios de creación/edición deben preferir el uso de Modales (Dialog) o Sidepanels (Sheet) para evitar recargas de página innecesarias.
# # El Dashboard del Admin debe mostrar KPIs (Tarjetas con números grandes) sobre: Total Usuarios, Áreas, Oficios Pendientes.
# # Seguir una paleta de colores limpia (Blanco, Gris muy claro y un color primario institucional como Azul oscuro o Slate).

7. MANEJO DE ARCHIVOS Y OCR
# - Los documentos deben almacenarse en 'storage/app/public/documentos'.
# - El proceso de OCR debe ejecutarse inmediatamente después de guardar el archivo.
# - Si el OCR falla, el campo 'contenido_ocr' debe quedar como null o vacío, pero no debe detener el registro del documento.
# - Formatos permitidos: PDF, PNG, JPG, JPEG.
# - Tamaño máximo de archivo: 4MB (Configurar en validación de Laravel).

# IMPORTANTE: Los nombres de las carpetas y archivos en resources/js/pages/ deben escribirse siempre en MINUSCULAS.
# Ejemplo: resources/js/pages/user/documentos/index.jsx

# Al crear un boton como editar o eliminar siempre me debe dar una advertencia de que la accion se realizo con exito

# LOGICA DE EXTRACCION INTELIGENTE:
# - Priorizar extracción de texto nativo usando 'smalot/pdfparser' para archivos PDF.
# - Si la extracción nativa devuelve menos de 50 caracteres, activar automáticamente el motor Tesseract OCR.
# - Para archivos de imagen (JPG, PNG), saltar directamente a Tesseract OCR.
# - El resultado final siempre debe normalizarse (quitar espacios extra y saltos de línea innecesarios) antes de guardarse en 'contenido_ocr'.

# PROTECCION DE DATOS (RESTRICT):
# - Queda estrictamente prohibido eliminar registros que tengan dependencias activas.
# - No se puede eliminar un AREA si tiene Usuarios o Documentos asociados.
# - No se puede eliminar un REMITENTE si tiene Documentos asociados.
# - No se puede eliminar un USUARIO si tiene Movimientos o Documentos registrados.
# - En los controladores, antes de un 'destroy()', se debe validar la existencia de relaciones y devolver un error de validación si existen dependencias.

# CODIGO DE COLORES PARA ESTADOS (BADGES):
# - recibido: Azul/Slate (Neutral)
# - enviado: Naranja/Amber (Tránsito)
# - en_revision: Amarillo (Pendiente)
# - aprobado: Verde (Éxito)
# - rechazado: Rojo (Error/Denegado)
# - respondido: Morado/Indigo (Finalizado)
# - Todos los Badges deben tener bordes redondeados (rounded-full) y texto en semibold.

# FLUJO DE ACCESO Y APROBACION:
# - Todo usuario nuevo inicia con el estado 'pendiente'.
# - El acceso al sistema está RESTRINGIDO si el estado no es 'aprobado'.
# - El Administrador debe ver una lista de "Solicitudes Pendientes" para cambiar el estado a 'aprobado' o 'rechazado'.
# - Si un usuario intenta loguearse y está 'pendiente', el sistema debe mostrar un mensaje: "Tu cuenta está esperando aprobación del administrador".
# LOGICA DE MOVIMIENTOS Y FLUJO:
# - Al ENVIAR: Se crea un registro en 'movimientos' y se actualiza 'area_actual_id' en la tabla 'documentos'.
# - El campo 'enviado_por' debe capturar el 'id_user' del remitente actual.
# - Al RECIBIR: El usuario del área destino debe marcar el documento como 'recibido', lo cual actualiza la 'fecha_recepcion' en la tabla 'movimientos'.
# - Un documento solo puede ser enviado por alguien que pertenezca al 'area_actual_id' del mismo.

# DETALLE DE MOVIMIENTOS (TRAZABILIDAD):
# - Cada movimiento debe mostrar: Área Origen, Área Destino, Usuario Remitente, Usuario Receptor (si ya se recibió), Fecha/Hora de Envío y Fecha/Hora de Recepción.
# - Si un movimiento tiene un 'comentario', debe ser visible en un formato de "burbuja de chat" o nota al pie del paso.
# - El sistema debe permitir "Responder" directamente desde un movimiento recibido, vinculando el nuevo documento mediante 'documento_padre_id'.

# COMPONENTES A USAR 
    npx shadcn@latest add table, npm install @tanstack/react-table
    npx shadcn@latest add dialog
    npx shadcn@latest add button
    npx shadcn@latest add input
    npx shadcn@latest add select
    npx shadcn@latest add card
    npx shadcn@latest add badge
    npx shadcn@latest add aspect-ratio
    npx shadcn@latest add progress
# Para alertas de eliminar
    npx shadcn@latest add alert-dialog
# Para alertas de actualizacion u otras
    npx shadcn@latest add alert
# Para mensajes de exito, para cuando se edita y se elimina una accion
    npx shadcn@latest add sonner
# Para el filtro por Fechas o uso de Calendario
    npx shadcn@latest add calendar
# Checkbox Para filtros rapidos
    npx shadcn@latest add checkbox
# Badge Para mostrar visualmente los filtros activos o los estados en la tabla.
    npx shadcn@latest add badge
# Avatar para mostar las iniciales del usuario
    npx shadcn@latest add avatar
# Command Para el buscador de areas dentro del formulario
    npx shadcn@latest add command
# Switch para activar o desactivar usuarios
    npx shadcn@latest add switch
# Dropdown menu para las acciones de cada fila, (Editar, Resetear Password, Eliminar).
    npx shadcn@latest add dropdown-menu
# Tabs Para separar en la misma vista a los usuarios "Activos" de los "Pendientes".
    npx shadcn@latest add tabs
# Tooltip Para mostrar un mensaje rápido al pasar el mouse sobre el botón de aprobar.
    npx shadcn@latest add tooltip
# Separator para dividir visualmente el historial de movimientos del documento
    npx shadcn@latest add separator
# Textarea para el comentario opcional
    npx shadcn@latest add textarea
# Scroll area si un documento tiene muchos movimientos evitar paginas infinitas
    npx shadcn@latest add scroll-area
# Sheet Perfecto para la accion de enviar, se abre un panel lateral donde eliges el área de destino sin perder de vista el documento.
    npx shadcn@latest add sheet
# Pagination este lo usaremos para todos los filtros de informacion, como documentos, users, areas, todo lo que filtre informacion, la paginacion sera en la parte superior y usaremos select para mostrar la cantidad de filtro que queramos, sean 5,7,10
    npx shadcn@latest add pagination

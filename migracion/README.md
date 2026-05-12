# Migración de JACs - MS Asocomunales

Script para migrar JACs desde la BD del MS JAC a la tabla espejo `jac` en MS Asocomunales.

## 📋 Requisitos Pre-requisitos

- ✅ Ejecutar `migracion.py` en `jac-backend/migracion/` PRIMERO
- ✅ Ambas bases de datos creadas (MS JAC y MS Asocomunales)
- ✅ Ambas BDs accesibles desde esta máquina

## 🚀 Instalación

### 1. Crear entorno virtual limpio

```bash
# Limpiar env anterior si existe (opcional)
deactivate
rmdir migracion_env /s /q  # Windows
# rm -rf migracion_env      # Linux/Mac

# Crear nuevo env
python -m venv migracion_env
migracion_env\Scripts\activate  # Windows
# source migracion_env/bin/activate  # Linux/Mac

# Actualizar pip
python -m pip install --upgrade pip
```

### 2. Instalar dependencias

```bash
pip install -r migracion_requirements.txt
```

**Nota:** En Windows, usamos `psycopg[binary]>=3.1.0` en lugar de `psycopg2-binary` para evitar errores de compilación C++.

### 3. Verificar instalación

```bash
python -c "import psycopg; import dotenv; print('✅ Todo instalado correctamente')"
```

### 4. Crear base de datos (si no existe)

```bash
psql -U postgres -c "CREATE DATABASE DBAsocomunales;"
```

### 5. Configurar .env

Copiar `.env.example` a `.env` y rellenar credenciales:

```bash
# Copiar plantilla (Windows)
copy .env.example .env
# Copiar plantilla (Linux/Mac)
# cp .env.example .env
```

Editar `.env` con tus credenciales reales de BD:

```env
# BD MS JAC (origen)
JAC_DB_HOST=localhost
JAC_DB_PORT=5432
JAC_DB_NAME=jac_cauca_db
JAC_DB_USER=postgres
JAC_DB_PASSWORD=tu_password_jac

# BD MS Asocomunales (destino)
ASOC_DB_HOST=localhost
ASOC_DB_PORT=5432
ASOC_DB_NAME=asocomunales_db
ASOC_DB_USER=postgres
ASOC_DB_PASSWORD=tu_password_asoc
```

## ▶️ Ejecutar Migración

```bash
# Asegúrate de estar en el directorio migracion/
cd migracion

# Activar env (si no está activado)
migracion_env\Scripts\activate  # Windows
# source migracion_env/bin/activate  # Linux/Mac

# Ejecutar migración
python migracion_jacs.py
```

## 📊 Salida Esperada

```
✅ Conexión a BD MS JAC exitosa
✅ Conexión a BD MS Asocomunales exitosa

⏳ Leyendo JACs de MS JAC...
✅ Encontradas 450 JACs activas/inactivas

  Procesadas 50/450...
  Procesadas 100/450...
  ...
  Procesadas 450/450...

✅ Migración completada:
   - Insertadas: 420
   - Actualizadas: 30
   - Total procesadas: 450
   - Errores: 0

✅ Sin errores en la migración.
```

## ⚠️ Si hay errores

Se genera archivo `errores_migracion_jacs.json` con detalles:

```json
[
  {
    "jac_id": 123,
    "nombre": "JAC Nueva",
    "municipio_id": 5,
    "asocomunal_id": null,
    "error": "Municipio no encontrado en MS Asocomunales"
  }
]
``` 

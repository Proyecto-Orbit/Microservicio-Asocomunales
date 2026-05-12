"""
Migración de JACs desde MS JAC a tabla espejo en MS Asocomunales.

Flujo:
  1. Lee JACs de la BD del MS JAC
  2. Para cada JAC, obtiene la asocomunal correcta
  3. Inserta en la tabla 'jac' del MS Asocomunales (tabla espejo)
  
Casos especiales:
  - Si asocomunal_id es NULL en MS JAC: busca por municipio
  - Municipios con múltiples asocomunales: selecciona la primera
  - JACs canceladas: se omiten

Requisitos:
    pip install 'psycopg[binary]>=3.1.0' python-dotenv

Pre-requisito:
    - Ejecutar migracion.py en jac-backend/migracion primero
    - Ambas BDs conectables y creadas
"""

import os
import json
import psycopg  # cambiar de: import psycopg2
from dotenv import load_dotenv

def main():
    load_dotenv()
    
    # ── Credenciales MS JAC (BD origen) ──────────────────────────────
    JAC_DB_HOST     = os.getenv('JAC_DB_HOST', 'localhost')
    JAC_DB_PORT     = os.getenv('JAC_DB_PORT', '5432')
    JAC_DB_NAME     = os.getenv('JAC_DB_NAME', 'jac_cauca_db')
    JAC_DB_USER     = os.getenv('JAC_DB_USER')
    JAC_DB_PASSWORD = os.getenv('JAC_DB_PASSWORD')
    
    # ── Credenciales MS Asocomunales (BD destino) ────────────────────
    ASOC_DB_HOST     = os.getenv('ASOC_DB_HOST', 'localhost')
    ASOC_DB_PORT     = os.getenv('ASOC_DB_PORT', '5432')
    ASOC_DB_NAME     = os.getenv('ASOC_DB_NAME', 'asocomunales_db')
    ASOC_DB_USER     = os.getenv('ASOC_DB_USER')
    ASOC_DB_PASSWORD = os.getenv('ASOC_DB_PASSWORD')
    
    # ── Validar credenciales ────────────────────────────────────────
    if not all([JAC_DB_USER, JAC_DB_PASSWORD, ASOC_DB_USER, ASOC_DB_PASSWORD]):
        print('❌ Faltan credenciales en .env')
        print('   Requeridas:')
        print('   - JAC_DB_USER, JAC_DB_PASSWORD')
        print('   - ASOC_DB_USER, ASOC_DB_PASSWORD')
        return
    
    conn_jac = None
    conn_asoc = None
    
    try:
        # ── Conectar a BD MS JAC ────────────────────────────────────
        print('⏳ Conectando a MS JAC...')
        conn_jac = psycopg.connect(
            host=JAC_DB_HOST, port=JAC_DB_PORT,
            dbname=JAC_DB_NAME, user=JAC_DB_USER, password=JAC_DB_PASSWORD,
        )
        cursor_jac = conn_jac.cursor()
        print('✅ Conexión a BD MS JAC exitosa')
        
        # ── Conectar a BD MS Asocomunales ────────────────────────────
        print('⏳ Conectando a MS Asocomunales...')
        conn_asoc = psycopg.connect(
            host=ASOC_DB_HOST, port=ASOC_DB_PORT,
            dbname=ASOC_DB_NAME, user=ASOC_DB_USER, password=ASOC_DB_PASSWORD,
        )
        cursor_asoc = conn_asoc.cursor()
        print('✅ Conexión a BD MS Asocomunales exitosa\n')
        
    except Exception as e:
        print(f'❌ Error al conectar: {e}')
        return
    
    try:
        # ⏳ PASO 1: Leer TODAS las JACs activas de MS JAC
        print('⏳ Leyendo JACs de MS JAC...')
        cursor_jac.execute(
            """
            SELECT id, nombre_completo, estado, asocomunal_id
            FROM public."JAC"
            WHERE estado != 'cancelada'
            ORDER BY id
            """
        )
        jacs = cursor_jac.fetchall()
        print(f'✅ Encontradas {len(jacs)} JACs activas/inactivas\n')
        
        # ⏳ PASO 2: Migrar cada JAC
        insertadas = 0
        actualizadas = 0
        errores = []
        
        for idx, (jac_id, nombre_completo, estado_str, asoc_id_original) in enumerate(jacs, 1):
            try:
                # Validar que nombre_completo no sea NULL (es obligatorio en entity)
                if not nombre_completo or not str(nombre_completo).strip():
                    errores.append({
                        'jac_id': jac_id,
                        'nombre': nombre_completo,
                        'asocomunal_id': asoc_id_original,
                        'error': 'Nombre de JAC vacío (obligatorio)'
                    })
                    continue
                
                # Convertir estado string a booleano
                estado_bool = estado_str == 'activa'
                
                # Usar asocomunal_id como está (puede ser NULL)
                asoc_id_final = asoc_id_original
                
                # Primero verificar si ya existe (para contar inserts vs updates)
                cursor_asoc.execute(
                    'SELECT id FROM jac WHERE "externalId" = %s',
                    (jac_id,)
                )
                ya_existe = cursor_asoc.fetchone() is not None
                
                # Insertar o actualizar en tabla JAC de MS Asocomunales
                cursor_asoc.execute(
                    """
                    INSERT INTO jac (nombre, estado, "asocomunalId", "externalId")
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT ("externalId") DO UPDATE 
                    SET nombre = EXCLUDED.nombre,
                        estado = EXCLUDED.estado,
                        "asocomunalId" = EXCLUDED."asocomunalId"
                    """,
                    (nombre_completo, estado_bool, asoc_id_final, jac_id)
                )
                
                if ya_existe:
                    actualizadas += 1
                else:
                    insertadas += 1
                
                conn_asoc.commit()
                
                # Progreso visual
                if idx % 50 == 0 or idx == len(jacs):
                    print(f'  Procesadas {idx}/{len(jacs)}... ({nombre_completo[:40]})')
                
            except Exception as e:
                conn_asoc.rollback()
                errores.append({
                    'jac_id': jac_id,
                    'nombre': nombre_completo,
                    'municipio_id': municipio_id,
                    'asocomunal_id': asoc_id_original,
                    'error': str(e)
                })
        
        # ✅ Resumen final
        print(f'\n✅ Migración completada:')
        print(f'   - Insertadas: {insertadas}')
        print(f'   - Actualizadas: {actualizadas}')
        print(f'   - Total procesadas: {insertadas + actualizadas}')
        print(f'   - Errores: {len(errores)}')
        
        # 📋 Generar reporte de errores si los hay
        if errores:
            reporte = 'errores_migracion_jacs.json'
            with open(reporte, 'w', encoding='utf-8') as f:
                json.dump(errores, f, ensure_ascii=False, indent=2)
            print(f'\n⚠️  {len(errores)} JACs con error → ver {reporte}')
        else:
            print('\n✅ Sin errores en la migración.')
        
    except Exception as e:
        print(f'❌ Error durante migración: {e}')
    
    finally:
        # Cerrar conexiones
        if conn_jac:
            cursor_jac.close()
            conn_jac.close()
        if conn_asoc:
            cursor_asoc.close()
            conn_asoc.close()

if __name__ == '__main__':
    main()

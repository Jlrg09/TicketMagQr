# migrate_database.py
import sqlite3
from datetime import datetime
from database import engine_codigos, BaseCodigos

def migrate_database():
    print("Iniciando migración de base de datos...")
    
    # Conectar directamente a la base de datos SQLite
    conn = sqlite3.connect('codigos.db')
    cursor = conn.cursor()
    
    try:
        # Verificar si los nuevos campos ya existen
        cursor.execute("PRAGMA table_info(Codigos)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Si ya existen todos los campos necesarios, salimos
        if all(col in columns for col in ['email', 'fecha_creacion', 'fecha_uso', 'vendedor_id', 'vendedor_email']):
            print("La base de datos ya tiene todos los campos necesarios. No se requiere migración.")
            return
        
        # Paso 1: Crear tabla temporal con el nuevo esquema
        print("Creando tabla temporal con nuevo esquema...")
        cursor.execute('''
        CREATE TABLE Codigos_temp (
            boleto INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT NOT NULL UNIQUE,
            usado BOOLEAN NOT NULL DEFAULT FALSE,
            vip BOOLEAN NOT NULL DEFAULT FALSE,
            email TEXT,
            fecha_creacion TIMESTAMP,
            fecha_uso TIMESTAMP,
            vendedor_id INTEGER,
            vendedor_email TEXT
        )
        ''')
        
        # Paso 2: Copiar datos de la tabla original a la temporal
        print("Copiando datos existentes...")
        
        # Determinar qué columnas existen en la tabla original
        cursor.execute("PRAGMA table_info(Codigos)")
        old_columns = [column[1] for column in cursor.fetchall()]
        
        # Crear una lista de columnas comunes entre la tabla antigua y la nueva
        common_columns = [col for col in old_columns if col in ['boleto', 'id', 'usado', 'vip', 'fecha_uso']]
        
        # Construir la consulta de inserción dinámicamente
        insert_columns = ", ".join(common_columns)
        select_columns = ", ".join(common_columns)
        
        # Insertar datos desde la tabla original a la temporal
        cursor.execute(f'''
        INSERT INTO Codigos_temp ({insert_columns})
        SELECT {select_columns} FROM Codigos
        ''')
        
        # Establecer valores predeterminados para las nuevas columnas
        current_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(f'''
        UPDATE Codigos_temp SET 
            email = NULL,
            fecha_creacion = '{current_time}',
            vendedor_id = NULL,
            vendedor_email = NULL
        ''')
        
        # Paso 3: Eliminar la tabla original
        print("Eliminando tabla original...")
        cursor.execute('DROP TABLE Codigos')
        
        # Paso 4: Renombrar la tabla temporal a la original
        print("Renombrando tabla temporal...")
        cursor.execute('ALTER TABLE Codigos_temp RENAME TO Codigos')
        
        # Paso 5: Crear índices necesarios
        print("Creando índices...")
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_codigos_email ON Codigos (email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_codigos_fecha_creacion ON Codigos (fecha_creacion)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_codigos_fecha_uso ON Codigos (fecha_uso)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_codigos_vendedor ON Codigos (vendedor_id)')
        
        # Commit de los cambios
        conn.commit()
        print("Migración completada con éxito.")
        
    except Exception as e:
        # En caso de error, hacer rollback
        conn.rollback()
        print(f"Error durante la migración: {e}")
    finally:
        # Cerrar conexión
        conn.close()

if __name__ == "__main__":
    migrate_database()
    
    # Recrear tablas con SQLAlchemy para asegurar consistencia
    BaseCodigos.metadata.create_all(engine_codigos)
    print("Esquema de SQLAlchemy actualizado.")
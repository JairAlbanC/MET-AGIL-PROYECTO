// server.js
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Servir archivos estáticos (HTML, CSS, JS)

// Configuración de la base de datos Tienda_Libros
const config = {
    server: 'localhost', // Cambia por tu servidor SQL Server
    database: 'Tienda_Libros', // Tu base de datos
    user: 'sa', // Tu usuario de SQL Server
    password: '2001Jaira', // Tu contraseña
    options: {
        encrypt: false, // Para servidor local
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

// Conectar a la base de datos
let pool;

async function connectToDatabase() {
    try {
        pool = await sql.connect(config);
        console.log('✓ Conectado a la base de datos Tienda_Libros');
    } catch (err) {
        console.error('Error de conexión a la base de datos:', err);
        process.exit(1);
    }
}

connectToDatabase();

// RUTAS API - Ajustadas según tu estructura de base de datos

// Obtener estadísticas para el dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const result = await pool.request()
            .query(`
                SELECT 
                    (SELECT COUNT(*) FROM Clientes) as total_clientes,
                    (SELECT COUNT(*) FROM Libros) as total_libros,
                    (SELECT COUNT(*) FROM Facturas) as total_facturas,
                    (SELECT COUNT(*) FROM Autores) as total_autores,
                    (SELECT COUNT(*) FROM Editoriales) as total_editoriales
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error al obtener estadísticas:', err);
        res.status(500).json({ 
            error: 'Error al obtener estadísticas',
            details: err.message 
        });
    }
});

// ===== RUTAS PARA LIBROS ACTUALIZADAS CON CAMPO TIPO =====

// Obtener todos los libros
app.get('/api/libros', async (req, res) => {
    try {
        console.log('📚 Obteniendo lista de libros...');
        
        const result = await pool.request()
            .query(`
                SELECT 
                    isbn,
                    titulo,
                    ideditorial as editorial_id,
                    idautor as autor_id,
                    tipo,
                    categoria,
                    YEAR(fecha_publicacion) as anio_publicacion,
                    precio,
                    cantidad,
                    CASE 
                        WHEN bestseller = 1 THEN 'Si' 
                        WHEN bestseller = 0 THEN 'No'
                        ELSE 'No'
                    END as bestseller,
                    estado
                FROM Libros
                ORDER BY fecha_publicacion DESC
            `);
        
        console.log(`✅ Se encontraron ${result.recordset.length} libros`);
        
        let librosConNombres = [];
        
        for (let libro of result.recordset) {
            let autor_nombre = 'N/A';
            let editorial_nombre = 'N/A';
            
            if (libro.autor_id) {
                try {
                    const autorResult = await pool.request()
                        .input('id', sql.BigInt, libro.autor_id)
                        .query('SELECT nombre FROM Autores WHERE idautor = @id');
                    
                    if (autorResult.recordset.length > 0) {
                        autor_nombre = autorResult.recordset[0].nombre;
                    }
                } catch (autorErr) {
                    console.log('⚠️ No se pudo obtener nombre del autor:', autorErr.message);
                }
            }
            
            if (libro.editorial_id) {
                try {
                    const editorialResult = await pool.request()
                        .input('id', sql.BigInt, libro.editorial_id)
                        .query('SELECT nombre FROM Editoriales WHERE ideditorial = @id');
                    
                    if (editorialResult.recordset.length > 0) {
                        editorial_nombre = editorialResult.recordset[0].nombre;
                    }
                } catch (editorialErr) {
                    console.log('⚠️ No se pudo obtener nombre de la editorial:', editorialErr.message);
                }
            }
            
            librosConNombres.push({
                ...libro,
                autor_nombre: autor_nombre,
                editorial_nombre: editorial_nombre
            });
        }
        
        const librosFinales = librosConNombres.map((libro, index) => ({
            ...libro,
            id: index
        }));
        
        res.json(librosFinales);
        
    } catch (err) {
        console.error('❌ Error al obtener libros:', err);
        res.status(500).json({ 
            error: 'Error al obtener libros',
            details: err.message 
        });
    }
});

// Obtener un libro específico por ISBN
app.get('/api/libros/:isbn', async (req, res) => {
    try {
        const { isbn } = req.params;
        
        const result = await pool.request()
            .input('isbn', sql.BigInt, isbn)
            .query(`
                SELECT 
                    l.*,
                    a.nombre as autor_nombre,
                    e.nombre as editorial_nombre
                FROM Libros l
                LEFT JOIN Autores a ON l.idautor = a.idautor
                LEFT JOIN Editoriales e ON l.ideditorial = e.ideditorial
                WHERE l.isbn = @isbn
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Libro no encontrado' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error al obtener libro:', err);
        res.status(500).json({ error: err.message });
    }
});

// Crear un nuevo libro
app.post('/api/libros', async (req, res) => {
    try {
        const { 
            isbn, 
            titulo, 
            editorial_id, 
            autor_id, 
            tipo,
            categoria, 
            anio_publicacion, 
            precio,
            cantidad,       // NUEVO CAMPO
            bestseller, 
            estado 
        } = req.body;

        if (!isbn || !titulo) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios: isbn, titulo' 
            });
        }

        // Validar que el tipo sea válido
        if (tipo && !['Digital', 'Fisico'].includes(tipo)) {
            return res.status(400).json({ 
                error: 'El tipo debe ser "Digital" o "Fisico"' 
            });
        }

        // Validar que la cantidad sea un número entero válido
        if (cantidad !== undefined && cantidad !== null) {
            const cantidadNum = parseInt(cantidad);
            if (isNaN(cantidadNum) || cantidadNum < 0) {
                return res.status(400).json({ 
                    error: 'La cantidad debe ser un número entero mayor o igual a 0' 
                });
            }
        }

        // Validar que la cantidad sea un número entero válido
        if (cantidad !== undefined && cantidad !== null) {
            const cantidadNum = parseInt(cantidad);
            if (isNaN(cantidadNum) || cantidadNum < 0) {
                return res.status(400).json({ 
                    error: 'La cantidad debe ser un número entero mayor o igual a 0' 
                });
            }
        }

        let fecha_publicacion = new Date();
        if (anio_publicacion) {
            fecha_publicacion = new Date(anio_publicacion, 0, 1);
        }

        const bestsellerBool = bestseller === 'Si' ? 1 : 0;

        console.log('📝 Registrando nuevo libro:', { isbn, titulo, tipo, categoria, cantidad, estado });

        const result = await pool.request()
            .input('isbn', sql.BigInt, parseInt(isbn))
            .input('titulo', sql.NVarChar(100), titulo)
            .input('ideditorial', sql.BigInt, editorial_id ? parseInt(editorial_id) : null)
            .input('idautor', sql.BigInt, autor_id ? parseInt(autor_id) : null)
            .input('tipo', sql.NVarChar(20), tipo || null)              // NUEVO CAMPO
            .input('categoria', sql.NVarChar(50), categoria || null)
            .input('fecha_publicacion', sql.Date, fecha_publicacion)
            .input('precio', sql.Decimal(10, 2), precio ? parseFloat(precio) : null)
            .input('cantidad', sql.Int, cantidad ? parseInt(cantidad) : 0) // NUEVO CAMPO
            .input('bestseller', sql.Bit, bestsellerBool)
            .input('estado', sql.NVarChar(20), estado || null)
            .query(`
                INSERT INTO Libros (
                    isbn, titulo, ideditorial, idautor, tipo, categoria, 
                    fecha_publicacion, precio, cantidad, bestseller, estado
                ) 
                OUTPUT INSERTED.* 
                VALUES (
                    @isbn, @titulo, @ideditorial, @idautor, @tipo, @categoria, 
                    @fecha_publicacion, @precio, @cantidad, @bestseller, @estado
                )
            `);

        console.log('✅ Libro registrado exitosamente:', result.recordset[0]);

        res.status(201).json({
            message: 'Libro registrado exitosamente',
            libro: result.recordset[0]
        });
    } catch (err) {
        console.error('❌ Error al registrar libro:', err);
        
        if (err.message.includes('Violation of PRIMARY KEY constraint')) {
            res.status(409).json({ 
                error: 'El ISBN proporcionado ya existe en la base de datos' 
            });
        } else if (err.message.includes('FOREIGN KEY constraint')) {
            res.status(400).json({ 
                error: 'El autor o editorial especificado no existe' 
            });
        } else if (err.message.includes('Invalid column name \'cantidad\'')) {
            res.status(500).json({ 
                error: 'La columna "cantidad" no existe en la base de datos. Por favor, ejecute la migración SQL primero.',
                details: 'ALTER TABLE Libros ADD cantidad INT DEFAULT 0;'
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al registrar libro',
                details: err.message 
            });
        }
    }
});

// Actualizar un libro
app.put('/api/libros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            isbn,
            titulo, 
            editorial_id, 
            autor_id, 
            tipo,
            categoria, 
            anio_publicacion, 
            precio,
            cantidad,       // NUEVO CAMPO
            bestseller, 
            estado 
        } = req.body;

        // Validar que el tipo sea válido
        if (tipo && !['Digital', 'Fisico'].includes(tipo)) {
            return res.status(400).json({ 
                error: 'El tipo debe ser "Digital" o "Fisico"' 
            });
        }

        let fecha_publicacion = new Date();
        if (anio_publicacion) {
            fecha_publicacion = new Date(anio_publicacion, 0, 1);
        }

        const bestsellerBool = bestseller === 'Si' ? 1 : 0;

        console.log('📝 Actualizando libro:', { isbn, titulo, tipo, categoria, cantidad, estado });

        const result = await pool.request()
            .input('isbn', sql.BigInt, parseInt(isbn))
            .input('titulo', sql.NVarChar(100), titulo)
            .input('ideditorial', sql.BigInt, editorial_id ? parseInt(editorial_id) : null)
            .input('idautor', sql.BigInt, autor_id ? parseInt(autor_id) : null)
            .input('tipo', sql.NVarChar(20), tipo || null)              // NUEVO CAMPO
            .input('categoria', sql.NVarChar(50), categoria || null)
            .input('fecha_publicacion', sql.Date, fecha_publicacion)
            .input('precio', sql.Decimal(10, 2), precio ? parseFloat(precio) : null)
            .input('cantidad', sql.Int, cantidad ? parseInt(cantidad) : 0) // NUEVO CAMPO
            .input('bestseller', sql.Bit, bestsellerBool)
            .input('estado', sql.NVarChar(20), estado || null)
            .query(`
                UPDATE Libros SET 
                    titulo = @titulo,
                    ideditorial = @ideditorial,
                    idautor = @idautor,
                    tipo = @tipo,
                    categoria = @categoria,
                    fecha_publicacion = @fecha_publicacion,
                    precio = @precio,
                    cantidad = @cantidad,
                    bestseller = @bestseller,
                    estado = @estado
                WHERE isbn = @isbn
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Libro no encontrado' });
        }

        console.log('✅ Libro actualizado correctamente');
        res.json({ message: 'Libro actualizado correctamente' });
    } catch (err) {
        console.error('❌ Error al actualizar libro:', err);
        
        if (err.message.includes('Invalid column name \'cantidad\'')) {
            res.status(500).json({ 
                error: 'La columna "cantidad" no existe en la base de datos. Por favor, ejecute la migración SQL primero.',
                details: 'ALTER TABLE Libros ADD cantidad INT DEFAULT 0;'
            });
        } else if (err.message.includes('Invalid column name \'tipo\'')) {
            res.status(500).json({ 
                error: 'La columna "tipo" no existe en la base de datos. Por favor, ejecute la migración SQL primero.',
                details: 'ALTER TABLE Libros ADD tipo NVARCHAR(20);'
            });
        } else {
            res.status(500).json({ 
                error: 'Error al actualizar libro',
                details: err.message 
            });
        }
    }
});

// Eliminar un libro
app.delete('/api/libros/:isbn', async (req, res) => {
    try {
        const { isbn } = req.params;
        console.log('🗑️ Intentando eliminar libro con ISBN:', isbn);
        
        const verificacion = await pool.request()
            .input('isbn', sql.BigInt, parseInt(isbn))
            .query('SELECT titulo FROM Libros WHERE isbn = @isbn');
        
        if (verificacion.recordset.length === 0) {
            return res.status(404).json({ error: 'Libro no encontrado' });
        }
        
        const tituloLibro = verificacion.recordset[0].titulo;
        
        const result = await pool.request()
            .input('isbn', sql.BigInt, parseInt(isbn))
            .query('DELETE FROM Libros WHERE isbn = @isbn');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'No se pudo eliminar el libro' });
        }

        console.log('✅ Libro eliminado correctamente:', tituloLibro);
        res.json({ 
            message: 'Libro eliminado correctamente',
            titulo: tituloLibro 
        });
        
    } catch (err) {
        console.error('❌ Error al eliminar libro:', err);
        
        if (err.message.includes('FOREIGN KEY constraint') || err.message.includes('REFERENCE constraint')) {
            res.status(400).json({ 
                error: 'No se puede eliminar el libro porque está siendo referenciado en otras tablas',
                details: 'Para eliminarlo, primero debe eliminar las referencias en otras tablas'
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al eliminar libro',
                details: err.message 
            });
        }
    }
});

// ===== NUEVA RUTA: OBTENER ESTADÍSTICAS DE LIBROS =====
app.get('/api/libros/stats/general', async (req, res) => {
    try {
        console.log('📊 Obteniendo estadísticas generales de libros...');
        
        const result = await pool.request()
            .query(`
                SELECT 
                    COUNT(*) as total_libros,
                    COUNT(CASE WHEN tipo = 'Digital' THEN 1 END) as libros_digitales,
                    COUNT(CASE WHEN tipo = 'Fisico' THEN 1 END) as libros_fisicos,
                    COUNT(CASE WHEN estado = 'Nuevo' THEN 1 END) as libros_nuevos,
                    COUNT(CASE WHEN estado = 'Donado' THEN 1 END) as libros_donados,
                    COUNT(CASE WHEN bestseller = 1 THEN 1 END) as bestsellers,
                    AVG(CAST(precio as FLOAT)) as precio_promedio,
                    SUM(cantidad) as total_ejemplares,
                    AVG(CAST(cantidad as FLOAT)) as promedio_cantidad_por_titulo,
                    COUNT(DISTINCT categoria) as categorias_diferentes,
                    COUNT(DISTINCT idautor) as autores_diferentes,
                    COUNT(DISTINCT ideditorial) as editoriales_diferentes
                FROM Libros
            `);
        
        const stats = result.recordset[0];
        
        // Estadísticas por categoría
        const categoriaResult = await pool.request()
            .query(`
                SELECT 
                    categoria,
                    COUNT(*) as cantidad,
                    SUM(cantidad) as total_ejemplares,
                    AVG(CAST(precio as FLOAT)) as precio_promedio_categoria
                FROM Libros 
                WHERE categoria IS NOT NULL
                GROUP BY categoria
                ORDER BY cantidad DESC
            `);
        
        console.log('✅ Estadísticas obtenidas correctamente');
        
        res.json({
            general: {
                total_libros: stats.total_libros,
                libros_digitales: stats.libros_digitales,
                libros_fisicos: stats.libros_fisicos,
                libros_nuevos: stats.libros_nuevos,
                libros_donados: stats.libros_donados,
                bestsellers: stats.bestsellers,
                precio_promedio: parseFloat(stats.precio_promedio || 0).toFixed(2),
                total_ejemplares: stats.total_ejemplares || 0,
                promedio_cantidad_por_titulo: parseFloat(stats.promedio_cantidad_por_titulo || 0).toFixed(1),
                categorias_diferentes: stats.categorias_diferentes,
                autores_diferentes: stats.autores_diferentes,
                editoriales_diferentes: stats.editoriales_diferentes
            },
            por_categoria: categoriaResult.recordset.map(cat => ({
                categoria: cat.categoria,
                cantidad: cat.cantidad,
                total_ejemplares: cat.total_ejemplares || 0,
                precio_promedio: parseFloat(cat.precio_promedio_categoria || 0).toFixed(2)
            }))
        });
        
    } catch (err) {
        console.error('❌ Error al obtener estadísticas:', err);
        res.status(500).json({ 
            error: 'Error al obtener estadísticas de libros',
            details: err.message 
        });
    }
});

// ===== RUTAS PARA AUTORES =====

// Obtener todos los autores
app.get('/api/autores', async (req, res) => {
    try {
        console.log('📚 Obteniendo lista de autores...');
        
        const result = await pool.request()
            .query('SELECT * FROM Autores ORDER BY idautor DESC');
        
        console.log(`✅ Se encontraron ${result.recordset.length} autores`);
        res.json(result.recordset);
        
    } catch (err) {
        console.error('❌ Error al obtener autores:', err);
        res.status(500).json({ 
            error: 'Error al obtener autores',
            details: err.message 
        });
    }
});

// Obtener el próximo ID disponible para autores
app.get('/api/autores/next-id', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT ISNULL(MAX(idautor), 0) + 1 as nextId FROM Autores');
        
        res.json({ nextId: result.recordset[0].nextId });
    } catch (err) {
        console.error('Error al obtener próximo ID:', err);
        res.status(500).json({ error: err.message });
    }
});

// Obtener un autor específico por ID
app.get('/api/autores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT * FROM Autores WHERE idautor = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Autor no encontrado' });
        }

        res.json(result.recordset[0]);
        
    } catch (err) {
        console.error('❌ Error al obtener autor:', err);
        res.status(500).json({ 
            error: 'Error al obtener autor',
            details: err.message 
        });
    }
});

// Crear un nuevo autor
app.post('/api/autores', async (req, res) => {
    try {
        const { 
            idautor, 
            nombre, 
            apellido, 
            email, 
            telefono, 
            estado 
        } = req.body;

        if (!idautor || !nombre || !apellido || !email) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios: idautor, nombre, apellido, email' 
            });
        }

        const existeAutor = await pool.request()
            .input('id', sql.BigInt, parseInt(idautor))
            .query('SELECT idautor FROM Autores WHERE idautor = @id');

        if (existeAutor.recordset.length > 0) {
            return res.status(409).json({ 
                error: 'El ID de autor ya existe en la base de datos' 
            });
        }

        const existeEmail = await pool.request()
            .input('email', sql.VarChar(100), email)
            .query('SELECT email FROM Autores WHERE email = @email');

        if (existeEmail.recordset.length > 0) {
            return res.status(409).json({ 
                error: 'El email ya está registrado para otro autor' 
            });
        }

        const result = await pool.request()
            .input('idautor', sql.BigInt, parseInt(idautor))
            .input('nombre', sql.VarChar(100), nombre.trim())
            .input('apellido', sql.VarChar(100), apellido.trim())
            .input('email', sql.VarChar(100), email.trim())
            .input('telefono', sql.VarChar(15), telefono ? telefono.trim() : null)
            .input('estado', sql.VarChar(20), estado ? estado.trim() : null)
            .query(`
                INSERT INTO Autores (
                    idautor, nombre, apellido, email, telefono, estado
                ) 
                OUTPUT INSERTED.* 
                VALUES (
                    @idautor, @nombre, @apellido, @email, @telefono, @estado
                )
            `);

        res.status(201).json({
            message: 'Autor registrado exitosamente',
            autor: result.recordset[0]
        });
        
    } catch (err) {
        console.error('❌ Error al registrar autor:', err);
        
        if (err.message.includes('Violation of PRIMARY KEY constraint')) {
            res.status(409).json({ 
                error: 'El ID de autor proporcionado ya existe en la base de datos' 
            });
        } else if (err.message.includes('Violation of UNIQUE KEY constraint')) {
            res.status(409).json({ 
                error: 'El email ya está registrado para otro autor' 
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al registrar autor',
                details: err.message 
            });
        }
    }
});

// Actualizar un autor existente
app.put('/api/autores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nombre, 
            apellido, 
            email, 
            telefono, 
            estado 
        } = req.body;

        if (!nombre || !apellido || !email) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios: nombre, apellido, email' 
            });
        }

        const autorExiste = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT idautor FROM Autores WHERE idautor = @id');

        if (autorExiste.recordset.length === 0) {
            return res.status(404).json({ error: 'Autor no encontrado' });
        }

        const emailExiste = await pool.request()
            .input('email', sql.VarChar(100), email.trim())
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT email FROM Autores WHERE email = @email AND idautor != @id');

        if (emailExiste.recordset.length > 0) {
            return res.status(409).json({ 
                error: 'El email ya está registrado para otro autor' 
            });
        }

        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .input('nombre', sql.VarChar(100), nombre.trim())
            .input('apellido', sql.VarChar(100), apellido.trim())
            .input('email', sql.VarChar(100), email.trim())
            .input('telefono', sql.VarChar(15), telefono ? telefono.trim() : null)
            .input('estado', sql.VarChar(20), estado ? estado.trim() : null)
            .query(`
                UPDATE Autores SET 
                    nombre = @nombre,
                    apellido = @apellido,
                    email = @email,
                    telefono = @telefono,
                    estado = @estado
                WHERE idautor = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'No se pudo actualizar el autor' });
        }

        res.json({ 
            message: 'Autor actualizado correctamente',
            idautor: id
        });
        
    } catch (err) {
        console.error('❌ Error al actualizar autor:', err);
        
        if (err.message.includes('Violation of UNIQUE KEY constraint')) {
            res.status(409).json({ 
                error: 'El email ya está registrado para otro autor' 
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al actualizar autor',
                details: err.message 
            });
        }
    }
});

// Eliminar un autor
app.delete('/api/autores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const verificacion = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT nombre, apellido FROM Autores WHERE idautor = @id');
        
        if (verificacion.recordset.length === 0) {
            return res.status(404).json({ error: 'Autor no encontrado' });
        }
        
        const nombreCompleto = `${verificacion.recordset[0].nombre} ${verificacion.recordset[0].apellido}`;
        
        const referenciasLibros = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT COUNT(*) as count FROM Libros WHERE idautor = @id');
        
        if (referenciasLibros.recordset[0].count > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar el autor porque tiene libros asociados',
                details: 'Para eliminarlo, primero debe eliminar o reasignar los libros asociados'
            });
        }
        
        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('DELETE FROM Autores WHERE idautor = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'No se pudo eliminar el autor' });
        }

        res.json({ 
            message: 'Autor eliminado correctamente',
            nombre: nombreCompleto 
        });
        
    } catch (err) {
        console.error('❌ Error al eliminar autor:', err);
        
        if (err.message.includes('FOREIGN KEY constraint') || err.message.includes('REFERENCE constraint')) {
            res.status(400).json({ 
                error: 'No se puede eliminar el autor porque está siendo referenciado en otras tablas',
                details: 'Para eliminarlo, primero debe eliminar las referencias en otras tablas'
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al eliminar autor',
                details: err.message 
            });
        }
    }
});

// ===== RUTAS PARA EDITORIALES =====

// Obtener todas las editoriales
app.get('/api/editoriales', async (req, res) => {
    try {
        console.log('🏢 Obteniendo lista de editoriales...');
        
        const result = await pool.request()
            .query('SELECT * FROM Editoriales ORDER BY ideditorial DESC');
        
        console.log(`✅ Se encontraron ${result.recordset.length} editoriales`);
        res.json(result.recordset);
        
    } catch (err) {
        console.error('❌ Error al obtener editoriales:', err);
        res.status(500).json({ 
            error: 'Error al obtener editoriales',
            details: err.message 
        });
    }
});

// Obtener el próximo ID disponible para editoriales
app.get('/api/editoriales/next-id', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT ISNULL(MAX(ideditorial), 0) + 1 as nextId FROM Editoriales');
        
        res.json({ nextId: result.recordset[0].nextId });
    } catch (err) {
        console.error('Error al obtener próximo ID de editorial:', err);
        res.status(500).json({ error: err.message });
    }
});

// Obtener una editorial específica por ID
app.get('/api/editoriales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT * FROM Editoriales WHERE ideditorial = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Editorial no encontrada' });
        }

        res.json(result.recordset[0]);
        
    } catch (err) {
        console.error('❌ Error al obtener editorial:', err);
        res.status(500).json({ 
            error: 'Error al obtener editorial',
            details: err.message 
        });
    }
});

// Crear una nueva editorial
app.post('/api/editoriales', async (req, res) => {
    try {
        const { 
            ideditorial, 
            nombre, 
            isbn, 
            cantidad, 
            email, 
            telefono, 
            sitio_web, 
            estado 
        } = req.body;

        if (!ideditorial || !nombre || !sitio_web || !estado) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios: ideditorial, nombre, sitio_web, estado' 
            });
        }

        const existeEditorial = await pool.request()
            .input('id', sql.BigInt, parseInt(ideditorial))
            .query('SELECT ideditorial FROM Editoriales WHERE ideditorial = @id');

        if (existeEditorial.recordset.length > 0) {
            return res.status(409).json({ 
                error: 'El ID de editorial ya existe en la base de datos' 
            });
        }

        if (email) {
            const existeEmail = await pool.request()
                .input('email', sql.VarChar(100), email)
                .query('SELECT email FROM Editoriales WHERE email = @email');

            if (existeEmail.recordset.length > 0) {
                return res.status(409).json({ 
                    error: 'El email ya está registrado para otra editorial' 
                });
            }
        }

        const result = await pool.request()
            .input('ideditorial', sql.BigInt, parseInt(ideditorial))
            .input('nombre', sql.VarChar(100), nombre.trim())
            .input('isbn', sql.BigInt, isbn ? parseInt(isbn) : null)
            .input('cantidad', sql.Int, cantidad ? parseInt(cantidad) : null)
            .input('email', sql.VarChar(100), email ? email.trim() : null)
            .input('telefono', sql.VarChar(15), telefono ? telefono.trim() : null)
            .input('sitio_web', sql.VarChar(100), sitio_web.trim())
            .input('estado', sql.VarChar(20), estado.trim())
            .query(`
                INSERT INTO Editoriales (
                    ideditorial, nombre, isbn, cantidad, email, telefono, sitio_web, estado
                ) 
                OUTPUT INSERTED.* 
                VALUES (
                    @ideditorial, @nombre, @isbn, @cantidad, @email, @telefono, @sitio_web, @estado
                )
            `);

        res.status(201).json({
            message: 'Editorial registrada exitosamente',
            editorial: result.recordset[0]
        });
        
    } catch (err) {
        console.error('❌ Error al registrar editorial:', err);
        
        if (err.message.includes('Violation of PRIMARY KEY constraint')) {
            res.status(409).json({ 
                error: 'El ID de editorial proporcionado ya existe en la base de datos' 
            });
        } else if (err.message.includes('Violation of UNIQUE KEY constraint')) {
            res.status(409).json({ 
                error: 'El email ya está registrado para otra editorial' 
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al registrar editorial',
                details: err.message 
            });
        }
    }
});

// Actualizar una editorial existente
app.put('/api/editoriales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nombre, 
            isbn, 
            cantidad, 
            email, 
            telefono, 
            sitio_web, 
            estado 
        } = req.body;

        if (!nombre || !sitio_web || !estado) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios: nombre, sitio_web, estado' 
            });
        }

        const editorialExiste = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT ideditorial FROM Editoriales WHERE ideditorial = @id');

        if (editorialExiste.recordset.length === 0) {
            return res.status(404).json({ error: 'Editorial no encontrada' });
        }

        if (email) {
            const emailExiste = await pool.request()
                .input('email', sql.VarChar(100), email.trim())
                .input('id', sql.BigInt, parseInt(id))
                .query('SELECT email FROM Editoriales WHERE email = @email AND ideditorial != @id');

            if (emailExiste.recordset.length > 0) {
                return res.status(409).json({ 
                    error: 'El email ya está registrado para otra editorial' 
                });
            }
        }

        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .input('nombre', sql.VarChar(100), nombre.trim())
            .input('isbn', sql.BigInt, isbn ? parseInt(isbn) : null)
            .input('cantidad', sql.Int, cantidad ? parseInt(cantidad) : null)
            .input('email', sql.VarChar(100), email ? email.trim() : null)
            .input('telefono', sql.VarChar(15), telefono ? telefono.trim() : null)
            .input('sitio_web', sql.VarChar(100), sitio_web.trim())
            .input('estado', sql.VarChar(20), estado.trim())
            .query(`
                UPDATE Editoriales SET 
                    nombre = @nombre,
                    isbn = @isbn,
                    cantidad = @cantidad,
                    email = @email,
                    telefono = @telefono,
                    sitio_web = @sitio_web,
                    estado = @estado
                WHERE ideditorial = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'No se pudo actualizar la editorial' });
        }

        res.json({ 
            message: 'Editorial actualizada correctamente',
            ideditorial: id
        });
        
    } catch (err) {
        console.error('❌ Error al actualizar editorial:', err);
        
        if (err.message.includes('Violation of UNIQUE KEY constraint')) {
            res.status(409).json({ 
                error: 'El email ya está registrado para otra editorial' 
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al actualizar editorial',
                details: err.message 
            });
        }
    }
});

// Eliminar una editorial
app.delete('/api/editoriales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const verificacion = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT nombre FROM Editoriales WHERE ideditorial = @id');
        
        if (verificacion.recordset.length === 0) {
            return res.status(404).json({ error: 'Editorial no encontrada' });
        }
        
        const nombreEditorial = verificacion.recordset[0].nombre;
        
        const referenciasLibros = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT COUNT(*) as count FROM Libros WHERE ideditorial = @id');
        
        if (referenciasLibros.recordset[0].count > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar la editorial porque tiene libros asociados',
                details: 'Para eliminarla, primero debe eliminar o reasignar los libros asociados'
            });
        }
        
        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('DELETE FROM Editoriales WHERE ideditorial = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'No se pudo eliminar la editorial' });
        }

        res.json({ 
            message: 'Editorial eliminada correctamente',
            nombre: nombreEditorial 
        });
        
    } catch (err) {
        console.error('❌ Error al eliminar editorial:', err);
        
        if (err.message.includes('FOREIGN KEY constraint') || err.message.includes('REFERENCE constraint')) {
            res.status(400).json({ 
                error: 'No se puede eliminar la editorial porque está siendo referenciada en otras tablas',
                details: 'Para eliminarla, primero debe eliminar las referencias en otras tablas'
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al eliminar editorial',
                details: err.message 
            });
        }
    }
});

// ===== RUTAS PARA CLIENTES =====

// Obtener todos los clientes
// Obtener un cliente específico por cédula
app.get('/api/clientes/cedula/:cedula', async (req, res) => {
    try {
        const { cedula } = req.params;
        console.log('🔍 Buscando cliente con cédula:', cedula);
        
        const result = await pool.request()
            .input('cedula', sql.BigInt, parseInt(cedula))
            .query('SELECT * FROM Clientes WHERE cedula = @cedula');

        if (result.recordset.length === 0) {
            console.log('❌ Cliente no encontrado con cédula:', cedula);
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = result.recordset[0];
        console.log('✅ Cliente encontrado:', cliente.nombre, cliente.apellido);
        res.json(cliente);
        
    } catch (err) {
        console.error('❌ Error al obtener cliente por cédula:', err);
        res.status(500).json({ 
            error: 'Error al obtener cliente',
            details: err.message 
        });
    }
});
// Crear un nuevo cliente
// Crear un nuevo cliente (VERSIÓN CORREGIDA)
// Obtener todos los clientes (RUTA FALTANTE)
app.get('/api/clientes', async (req, res) => {
    try {
        console.log('👥 Obteniendo lista de todos los clientes...');
        
        const result = await pool.request()
            .query(`
                SELECT 
                    id,
                    cedula,
                    nombre,
                    apellido,
                    telefono,
                    direccion,
                    email,
                    fecha_registro,
                    estado
                FROM Clientes 
                ORDER BY fecha_registro DESC
            `);
        
        console.log(`✅ Se encontraron ${result.recordset.length} clientes`);
        res.json(result.recordset);
        
    } catch (err) {
        console.error('❌ Error al obtener clientes:', err);
        res.status(500).json({ 
            error: 'Error al obtener clientes',
            details: err.message 
        });
    }
});
app.post('/api/clientes', async (req, res) => {
    try {
        const { 
            cedula, 
            nombre, 
            apellido, 
            telefono, 
            direccion, 
            email, 
            estado 
        } = req.body;

        console.log('📝 Datos recibidos para nuevo cliente:', req.body);

        // Validaciones básicas
        if (!cedula || !nombre || !email) {
            console.error('❌ Faltan campos obligatorios:', { cedula, nombre, email });
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios: cedula, nombre, email' 
            });
        }

        // Validar formato de email básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'El formato del email es inválido' 
            });
        }

        // Verificar si ya existe la cédula
        const existeCedula = await pool.request()
            .input('cedula', sql.BigInt, parseInt(cedula))
            .query('SELECT cedula FROM Clientes WHERE cedula = @cedula');

        if (existeCedula.recordset.length > 0) {
            return res.status(409).json({ 
                error: 'La cédula ya está registrada para otro cliente' 
            });
        }

        // Verificar si ya existe el email
        const existeEmail = await pool.request()
            .input('email', sql.VarChar(50), email.trim())
            .query('SELECT email FROM Clientes WHERE email = @email');

        if (existeEmail.recordset.length > 0) {
            return res.status(409).json({ 
                error: 'El email ya está registrado para otro cliente' 
            });
        }

        // Insertar nuevo cliente (sin especificar ID, se auto-genera)
        const result = await pool.request()
            .input('cedula', sql.BigInt, parseInt(cedula))
            .input('nombre', sql.VarChar(50), nombre.trim())
            .input('apellido', sql.VarChar(50), apellido ? apellido.trim() : '')
            .input('telefono', sql.VarChar(50), telefono ? telefono.trim() : null)
            .input('direccion', sql.VarChar(50), direccion ? direccion.trim() : '')
            .input('email', sql.VarChar(50), email.trim())
            .input('fecha_registro', sql.Date, new Date())
            .input('estado', sql.VarChar(50), estado ? estado.trim() : 'Activo')
            .query(`
                INSERT INTO Clientes (
                    cedula, nombre, apellido, telefono, direccion, email, fecha_registro, estado
                ) 
                OUTPUT INSERTED.* 
                VALUES (
                    @cedula, @nombre, @apellido, @telefono, @direccion, @email, @fecha_registro, @estado
                )
            `);

        console.log('✅ Cliente creado exitosamente:', result.recordset[0]);

        res.status(201).json({
            message: 'Cliente registrado exitosamente',
            cliente: result.recordset[0]
        });
        
    } catch (err) {
        console.error('❌ Error detallado al registrar cliente:', err);
        
        if (err.message.includes('Violation of PRIMARY KEY constraint')) {
            res.status(409).json({ 
                error: 'La cédula proporcionada ya existe en la base de datos' 
            });
        } else if (err.message.includes('Violation of UNIQUE KEY constraint')) {
            res.status(409).json({ 
                error: 'El email ya está registrado para otro cliente' 
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al registrar cliente',
                details: err.message 
            });
        }
    }
});

// Actualizar un cliente existente
app.put('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            cedula,
            nombre, 
            apellido, 
            telefono, 
            direccion, 
            email, 
            estado 
        } = req.body;

        if (!cedula || !nombre || !apellido || !direccion || !email || !estado) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios: cedula, nombre, apellido, direccion, email, estado' 
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'El email debe contener @ y terminar en .com' 
            });
        }

        const clienteExiste = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT id FROM Clientes WHERE id = @id');

        if (clienteExiste.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cedulaExiste = await pool.request()
            .input('cedula', sql.BigInt, parseInt(cedula))
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT cedula FROM Clientes WHERE cedula = @cedula AND id != @id');

        if (cedulaExiste.recordset.length > 0) {
            return res.status(409).json({ 
                error: 'La cédula ya está registrada para otro cliente' 
            });
        }

        const emailExiste = await pool.request()
            .input('email', sql.VarChar(50), email.trim())
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT email FROM Clientes WHERE email = @email AND id != @id');

        if (emailExiste.recordset.length > 0) {
            return res.status(409).json({ 
                error: 'El email ya está registrado para otro cliente' 
            });
        }

        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .input('cedula', sql.BigInt, parseInt(cedula))
            .input('nombre', sql.VarChar(50), nombre.trim())
            .input('apellido', sql.VarChar(50), apellido.trim())
            .input('telefono', sql.VarChar(50), telefono ? telefono.trim() : null)
            .input('direccion', sql.VarChar(50), direccion.trim())
            .input('email', sql.VarChar(50), email.trim())
            .input('estado', sql.VarChar(50), estado.trim())
            .query(`
                UPDATE Clientes SET 
                    cedula = @cedula,
                    nombre = @nombre,
                    apellido = @apellido,
                    telefono = @telefono,
                    direccion = @direccion,
                    email = @email,
                    estado = @estado
                WHERE id = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'No se pudo actualizar el cliente' });
        }

        res.json({ 
            message: 'Cliente actualizado correctamente',
            id: id
        });
        
    } catch (err) {
        console.error('❌ Error al actualizar cliente:', err);
        
        if (err.message.includes('Violation of UNIQUE KEY constraint')) {
            res.status(409).json({ 
                error: 'La cédula o email ya está registrado para otro cliente' 
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al actualizar cliente',
                details: err.message 
            });
        }
    }
});

// Eliminar un cliente
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const verificacion = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT nombre, apellido FROM Clientes WHERE id = @id');
        
        if (verificacion.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const nombreCompleto = `${verificacion.recordset[0].nombre} ${verificacion.recordset[0].apellido}`;
        
        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('DELETE FROM Clientes WHERE id = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'No se pudo eliminar el cliente' });
        }

        res.json({ 
            message: 'Cliente eliminado correctamente',
            nombre: nombreCompleto 
        });
        
    } catch (err) {
        console.error('❌ Error al eliminar cliente:', err);
        
        if (err.message.includes('FOREIGN KEY constraint') || err.message.includes('REFERENCE constraint')) {
            res.status(400).json({ 
                error: 'No se puede eliminar el cliente porque está siendo referenciado en otras tablas',
                details: 'Para eliminarlo, primero debe eliminar las referencias en otras tablas'
            });
        } else {
            res.status(500).json({ 
                error: 'Error interno del servidor al eliminar cliente',
                details: err.message 
            });
        }
    }
});



// ===== RUTAS PARA FACTURAS - ESTRUCTURA CORRECTA =====
// REEMPLAZAR la sección de facturas en server.js
// ===== ASEGÚRATE DE TENER ESTA RUTA EN SERVER.JS =====

// Obtener todas las facturas con resumen
app.get('/api/facturas', async (req, res) => {
    try {
        console.log('📋 Obteniendo resumen de facturas...');
        
        const result = await pool.request()
            .query(`
                SELECT 
                    f.id,
                    f.numero_factura,
                    f.fecha_factura,
                    f.cliente_cedula,
                    f.cliente_nombre,
                    f.cliente_telefono,
                    f.cliente_email,
                    f.cliente_direccion,
                    f.subtotal,
                    f.iva,
                    f.total,
                    f.estado,
                    f.fecha_creacion,
                    COUNT(df.id) as total_items,
                    SUM(df.cantidad) as total_productos
                FROM Facturas f
                LEFT JOIN Detallefactura df ON f.id = df.factura_id
                GROUP BY f.id, f.numero_factura, f.fecha_factura, f.cliente_cedula,
                         f.cliente_nombre, f.cliente_telefono, f.cliente_email,
                         f.cliente_direccion, f.subtotal, f.iva, f.total,
                         f.estado, f.fecha_creacion
                ORDER BY f.fecha_creacion DESC
            `);
        
        console.log(`✅ Se encontraron ${result.recordset.length} facturas`);
        res.json(result.recordset);
        
    } catch (err) {
        console.error('❌ Error al obtener facturas:', err);
        res.status(500).json({ 
            error: 'Error al obtener facturas',
            details: err.message 
        });
    }
});

// También asegúrate de tener esta ruta para obtener una factura individual
app.get('/api/facturas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Buscando factura con ID:', id);
        
        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query(`
                SELECT 
                    f.id,
                    f.numero_factura,
                    f.fecha_factura,
                    f.cliente_cedula,
                    f.cliente_nombre,
                    f.cliente_telefono,
                    f.cliente_email,
                    f.cliente_direccion,
                    f.subtotal,
                    f.iva,
                    f.total,
                    f.estado,
                    f.fecha_creacion,
                    COUNT(df.id) as total_items
                FROM Facturas f
                LEFT JOIN Detallefactura df ON f.id = df.factura_id
                WHERE f.id = @id
                GROUP BY f.id, f.numero_factura, f.fecha_factura, f.cliente_cedula,
                         f.cliente_nombre, f.cliente_telefono, f.cliente_email,
                         f.cliente_direccion, f.subtotal, f.iva, f.total,
                         f.estado, f.fecha_creacion
            `);

        if (result.recordset.length === 0) {
            console.log('❌ Factura no encontrada con ID:', id);
            return res.status(404).json({ error: 'Factura no encontrada' });
        }

        const factura = result.recordset[0];
        console.log('✅ Factura encontrada:', factura.numero_factura);
        res.json(factura);
        
    } catch (err) {
        console.error('❌ Error al obtener factura:', err);
        res.status(500).json({ 
            error: 'Error al obtener factura',
            details: err.message 
        });
    }
});

// Ruta de prueba para facturas
app.get('/api/test/facturas', (req, res) => {
    res.json({ 
        mensaje: 'Ruta de facturas funciona correctamente',
        timestamp: new Date().toISOString(),
        status: 'OK'
    });
});


// ===== NUEVA RUTA PARA OBTENER FACTURAS (REEMPLAZAR LA ACTUAL) =====

// Obtener todas las facturas con resumen
// ===== CORREGIR ESTA RUTA EN SERVER.JS =====

// Obtener una factura específica por ID - RUTA CORREGIDA
app.get('/api/facturas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Buscando factura con ID:', id);
        
        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query(`
                SELECT 
                    f.id,
                    f.numero_factura,
                    f.fecha_factura,
                    f.cliente_cedula,
                    f.cliente_nombre,
                    f.cliente_telefono,
                    f.cliente_email,
                    f.cliente_direccion,
                    f.subtotal,
                    f.iva,
                    f.total,
                    f.estado,
                    f.fecha_creacion,
                    COUNT(df.id) as total_items
                FROM Facturas f
                LEFT JOIN Detallefactura df ON f.id = df.factura_id
                WHERE f.id = @id
                GROUP BY f.id, f.numero_factura, f.fecha_factura, f.cliente_cedula,
                         f.cliente_nombre, f.cliente_telefono, f.cliente_email,
                         f.cliente_direccion, f.subtotal, f.iva, f.total,
                         f.estado, f.fecha_creacion
            `);

        if (result.recordset.length === 0) {
            console.log('❌ Factura no encontrada con ID:', id);
            return res.status(404).json({ error: 'Factura no encontrada' });
        }

        const factura = result.recordset[0];
        console.log('✅ Factura encontrada:', factura.numero_factura);
        res.json(factura);
        
    } catch (err) {
        console.error('❌ Error al obtener factura:', err);
        res.status(500).json({ 
            error: 'Error al obtener factura',
            details: err.message 
        });
    }
});

// MANTENER la ruta de detalles existente para el modal
// /api/facturas/:id/detalles (ya existe en tu código)

// Obtener una factura específica por ID
// ===== VERIFICAR QUE ESTAS RUTAS EXISTAN EN TU SERVER.JS =====

// 1. Ruta para obtener una factura específica
app.get('/api/facturas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Buscando factura con ID:', id);
        
        const result = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query(`
                SELECT 
                    f.*,
                    COUNT(df.id) as total_items
                FROM Facturas f
                LEFT JOIN Detallefactura df ON f.id = df.factura_id
                WHERE f.id = @id
                GROUP BY f.id, f.numero_factura, f.fecha_factura, f.cliente_nombre,
                         f.cliente_telefono, f.cliente_email, f.cliente_direccion,
                         f.subtotal, f.iva, f.total, f.estado, f.fecha_creacion, f.cliente_cedula
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }

        console.log('✅ Factura encontrada:', result.recordset[0]);
        res.json(result.recordset[0]);
        
    } catch (err) {
        console.error('❌ Error al obtener factura:', err);
        res.status(500).json({ 
            error: 'Error al obtener factura',
            details: err.message 
        });
    }
});

// 2. Ruta para obtener detalles de una factura específica
app.get('/api/facturas/:id/detalles', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Buscando detalles de factura ID:', id);
        
        const result = await pool.request()
            .input('factura_id', sql.BigInt, parseInt(id))
            .query(`
                SELECT 
                    f.numero_factura,
                    f.cliente_nombre,
                    f.fecha_factura,
                    f.estado,
                    df.id_detalle,
                    df.isbn_libro,
                    l.titulo as libro_titulo,
                    df.cantidad,
                    df.precio_unitario,
                    df.total_item
                FROM Facturas f
                INNER JOIN Detallefactura df ON f.id = df.factura_id
                LEFT JOIN Libros l ON df.isbn_libro = l.isbn
                WHERE f.id = @factura_id
                ORDER BY df.id
            `);

        console.log(`✅ ${result.recordset.length} detalles encontrados`);
        res.json(result.recordset);
        
    } catch (err) {
        console.error('❌ Error al obtener detalles de factura:', err);
        res.status(500).json({ 
            error: 'Error al obtener detalles de factura',
            details: err.message 
        });
    }
});
// Crear una nueva factura con número automático
// Crear una nueva factura con número automático
app.post('/api/facturas', async (req, res) => {
    const transaction = new sql.Transaction(pool);
    
    try {
        const { 
            fecha_factura,
            cliente_cedula,
            cliente_nombre,
            cliente_telefono,
            cliente_email,
            cliente_direccion,
            items
        } = req.body;

        console.log('📝 Creando nueva factura:', req.body);

        if (!fecha_factura || !cliente_cedula || !cliente_nombre || !items || items.length === 0) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios: fecha_factura, cliente_cedula, cliente_nombre, items' 
            });
        }

        let subtotal = 0;
        const itemsValidados = [];

        for (let item of items) {
            const libroResult = await pool.request()
                .input('isbn', sql.BigInt, parseInt(item.isbn))
                .query('SELECT isbn, titulo, precio FROM Libros WHERE isbn = @isbn');

            if (libroResult.recordset.length === 0) {
                return res.status(400).json({ 
                    error: `El libro con ISBN ${item.isbn} no existe en la base de datos` 
                });
            }

            const totalItem = parseFloat(item.cantidad) * parseFloat(item.precio_unitario);
            subtotal += totalItem;

            itemsValidados.push({
                ...item,
                total_item: totalItem
            });
        }

        const iva = subtotal * 0.15;
        const total = subtotal + iva;

        await transaction.begin();

        // Insertar factura - el campo id se genera automáticamente
        const facturaResult = await new sql.Request(transaction)
            .input('fecha_factura', sql.Date, new Date(fecha_factura))
            .input('cliente_cedula', sql.BigInt, parseInt(cliente_cedula))
            .input('cliente_nombre', sql.NVarChar(100), cliente_nombre)
            .input('cliente_telefono', sql.NVarChar(15), cliente_telefono || null)
            .input('cliente_email', sql.NVarChar(100), cliente_email || null)
            .input('cliente_direccion', sql.NVarChar(200), cliente_direccion || null)
            .input('subtotal', sql.Decimal(10, 2), subtotal)
            .input('iva', sql.Decimal(10, 2), iva)
            .input('total', sql.Decimal(10, 2), total)
            .input('estado', sql.NVarChar(20), 'Activa')
            .input('fecha_creacion', sql.DateTime, new Date())
            .query(`
                INSERT INTO Facturas (
                    fecha_factura, cliente_cedula, cliente_nombre, cliente_telefono,
                    cliente_email, cliente_direccion, subtotal, iva, total, estado, fecha_creacion
                ) 
                OUTPUT INSERTED.id, INSERTED.numero_factura
                VALUES (
                    @fecha_factura, @cliente_cedula, @cliente_nombre, @cliente_telefono,
                    @cliente_email, @cliente_direccion, @subtotal, @iva, @total, @estado, @fecha_creacion
                )
            `);

        const facturaId = facturaResult.recordset[0].id;
        const numeroFactura = facturaResult.recordset[0].numero_factura;

        // Insertar detalles de la factura
        for (let item of itemsValidados) {
            await new sql.Request(transaction)
                .input('factura_id', sql.BigInt, facturaId)
                .input('id_detalle', sql.NVarChar(50), item.id_detalle)
                .input('isbn_libro', sql.BigInt, parseInt(item.isbn))
                .input('cantidad', sql.Int, parseInt(item.cantidad))
                .input('precio_unitario', sql.Decimal(10, 2), parseFloat(item.precio_unitario))
                .input('total_item', sql.Decimal(10, 2), item.total_item)
                .query(`
                    INSERT INTO Detallefactura (
                        factura_id, id_detalle, isbn_libro, cantidad, precio_unitario, total_item
                    ) VALUES (
                        @factura_id, @id_detalle, @isbn_libro, @cantidad, @precio_unitario, @total_item
                    )
                `);
        }

        await transaction.commit();

        res.status(201).json({
            message: 'Factura registrada exitosamente',
            factura: {
                id: facturaId,
                numero_factura: numeroFactura,
                cliente_cedula: cliente_cedula,
                total: total,
                items_count: itemsValidados.length
            }
        });
        
    } catch (err) {
        if (transaction._acquiredConnection) {
            await transaction.rollback();
        }
        
        console.error('❌ Error al registrar factura:', err);
        res.status(500).json({ 
            error: 'Error interno del servidor al registrar factura',
            details: err.message 
        });
    }
});

// Eliminar una factura completamente
app.delete('/api/facturas/:id', async (req, res) => {
    const transaction = new sql.Transaction(pool);
    
    try {
        const { id } = req.params;
        console.log('🗑️ Intentando eliminar factura con ID:', id);
        
        // Verificar que la factura existe antes de eliminarla
        const verificacion = await pool.request()
            .input('id', sql.BigInt, parseInt(id))
            .query('SELECT id, numero_factura, cliente_nombre, estado FROM Facturas WHERE id = @id');
        
        if (verificacion.recordset.length === 0) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }
        
        const factura = verificacion.recordset[0];
        console.log('📄 Factura encontrada:', factura.numero_factura, 'Cliente:', factura.cliente_nombre);
        
        await transaction.begin();
        
        // Eliminar detalles primero (por la clave foránea)
        const detallesResult = await new sql.Request(transaction)
            .input('factura_id', sql.BigInt, parseInt(id))
            .query('DELETE FROM Detallefactura WHERE factura_id = @factura_id');
        
        console.log('🗑️ Detalles eliminados:', detallesResult.rowsAffected[0]);
        
        // Eliminar factura
        const facturaResult = await new sql.Request(transaction)
            .input('id', sql.BigInt, parseInt(id))
            .query('DELETE FROM Facturas WHERE id = @id');

        if (facturaResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(500).json({ error: 'No se pudo eliminar la factura' });
        }

        await transaction.commit();

        console.log('✅ Factura eliminada exitosamente:', factura.numero_factura);
        res.json({ 
            message: 'Factura eliminada completamente',
            numero_factura: factura.numero_factura,
            cliente: factura.cliente_nombre
        });
        
    } catch (err) {
        if (transaction._acquiredConnection) {
            await transaction.rollback();
        }
        
        console.error('❌ Error al eliminar factura:', err);
        res.status(500).json({ 
            error: 'Error interno del servidor al eliminar factura',
            details: err.message 
        });
    }
});



// ===== ENDPOINTS DE REPORTES COMPLETOS Y CORREGIDOS =====
// REEMPLAZAR toda la sección de reportes en server.js con estos endpoints

// ===== ENDPOINTS CORREGIDOS PARA ESTADOS "NUEVO" Y "DONADO" =====

// 1. REPORTE DE VENTAS SEMANALES (SIN CAMBIOS)
app.get('/api/reports/weekly-sales', async (req, res) => {
    try {
        console.log('📊 Obteniendo reporte de ventas semanales...');
        
        const result = await pool.request()
            .query(`
                SELECT 
                    DATEPART(WEEK, f.fecha_factura) as semana,
                    YEAR(f.fecha_factura) as anio,
                    SUM(f.total) as total_ventas,
                    COUNT(f.id) as cantidad_facturas,
                    CASE 
                        WHEN DATEPART(WEEK, f.fecha_factura) = DATEPART(WEEK, GETDATE()) 
                             AND YEAR(f.fecha_factura) = YEAR(GETDATE())
                        THEN 'current_week'
                        WHEN DATEPART(WEEK, f.fecha_factura) = DATEPART(WEEK, DATEADD(WEEK, -1, GETDATE())) 
                             AND YEAR(f.fecha_factura) = YEAR(DATEADD(WEEK, -1, GETDATE()))
                        THEN 'previous_week'
                        ELSE 'other_week'
                    END as periodo,
                    CONCAT('Semana ', DATEPART(WEEK, f.fecha_factura)) as label
                FROM Facturas f
                WHERE f.estado = 'Activa' 
                    AND f.fecha_factura >= DATEADD(WEEK, -8, GETDATE())
                GROUP BY DATEPART(WEEK, f.fecha_factura), YEAR(f.fecha_factura)
                ORDER BY YEAR(f.fecha_factura), DATEPART(WEEK, f.fecha_factura)
            `);

        const chartData = [];
        let current_week = 0;
        let previous_week = 0;

        result.recordset.forEach(row => {
            chartData.push({
                semana: row.semana,
                anio: row.anio,
                label: row.label,
                ventas: parseFloat(row.total_ventas) || 0,
                facturas: row.cantidad_facturas || 0
            });

            if (row.periodo === 'current_week') {
                current_week = parseFloat(row.total_ventas) || 0;
            } else if (row.periodo === 'previous_week') {
                previous_week = parseFloat(row.total_ventas) || 0;
            }
        });

        const growth_percentage = previous_week > 0 ? 
            ((current_week - previous_week) / previous_week * 100).toFixed(1) : 0;
        
        const average_weekly_sales = chartData.length > 0 ? 
            (chartData.reduce((sum, week) => sum + week.ventas, 0) / chartData.length).toFixed(2) : 0;

        console.log(`✅ Datos obtenidos - ${chartData.length} semanas, Esta semana: $${current_week}, Anterior: $${previous_week}`);
        
        res.json({
            summary: {
                current_week: current_week,
                previous_week: previous_week,
                growth_percentage: parseFloat(growth_percentage),
                average_weekly_sales: parseFloat(average_weekly_sales)
            },
            chart_data: chartData,
            meta: {
                weeks_analyzed: chartData.length,
                data_period: `Últimas ${chartData.length} semanas`,
                last_update: new Date().toISOString()
            }
        });
        
    } catch (err) {
        console.error('❌ Error al obtener ventas semanales:', err);
        res.status(500).json({ 
            error: 'Error al obtener reporte de ventas semanales',
            details: err.message
        });
    }
});

// 2. LIBROS DE BAJA ROTACIÓN CON PAGINACIÓN (ACTUALIZADO)
app.get('/api/reports/low-rotation-books', async (req, res) => {
    try {
        console.log('📚 Obteniendo libros de baja rotación con paginación...');
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        console.log(`📄 Página solicitada: ${page}, Límite: ${limit}, Offset: ${offset}`);
        
        const countResult = await pool.request()
            .query(`
                SELECT COUNT(*) as total
                FROM Libros l
                LEFT JOIN (
                    SELECT 
                        df.isbn_libro,
                        SUM(df.cantidad) as cantidad_vendida
                    FROM Detallefactura df
                    INNER JOIN Facturas f ON df.factura_id = f.id
                    WHERE f.fecha_factura >= DATEADD(DAY, -30, GETDATE())
                        AND f.estado = 'Activa'
                    GROUP BY df.isbn_libro
                ) ventas ON l.isbn = ventas.isbn_libro
                WHERE l.estado IN ('Nuevo', 'Donado')
                    AND ISNULL(ventas.cantidad_vendida, 0) < 3
            `);
        
        const totalRecords = countResult.recordset[0].total;
        const totalPages = Math.ceil(totalRecords / limit);
        
        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT 
                    l.isbn,
                    l.titulo,
                    CONCAT(ISNULL(a.nombre, ''), ' ', ISNULL(a.apellido, '')) as autor,
                    l.categoria,
                    l.precio,
                    l.fecha_publicacion,
                    l.estado,
                    ISNULL(ventas.cantidad_vendida, 0) as ventas_30_dias
                FROM Libros l
                LEFT JOIN Autores a ON l.idautor = a.idautor
                LEFT JOIN (
                    SELECT 
                        df.isbn_libro,
                        SUM(df.cantidad) as cantidad_vendida
                    FROM Detallefactura df
                    INNER JOIN Facturas f ON df.factura_id = f.id
                    WHERE f.fecha_factura >= DATEADD(DAY, -30, GETDATE())
                        AND f.estado = 'Activa'
                    GROUP BY df.isbn_libro
                ) ventas ON l.isbn = ventas.isbn_libro
                WHERE l.estado IN ('Nuevo', 'Donado')
                    AND ISNULL(ventas.cantidad_vendida, 0) < 3
                ORDER BY ventas_30_dias ASC, l.titulo
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        console.log(`✅ Página ${page}/${totalPages} - ${result.recordset.length} libros de ${totalRecords} total`);
        
        const librosFormateados = result.recordset.map(libro => ({
            isbn: libro.isbn,
            titulo: libro.titulo,
            autor: libro.autor.trim() || 'Autor no asignado',
            categoria: libro.categoria || 'Sin categoría',
            precio: parseFloat(libro.precio) || 0,
            fecha_publicacion: libro.fecha_publicacion,
            estado: libro.estado,
            ventas_30_dias: libro.ventas_30_dias
        }));
        
        res.json({
            data: librosFormateados,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_records: totalRecords,
                per_page: limit,
                has_next: page < totalPages,
                has_previous: page > 1,
                next_page: page < totalPages ? page + 1 : null,
                previous_page: page > 1 ? page - 1 : null
            }
        });
        
    } catch (err) {
        console.error('❌ Error al obtener libros de baja rotación:', err);
        res.status(500).json({ 
            error: 'Error al obtener libros de baja rotación',
            details: err.message 
        });
    }
});

// 3. LIBROS MÁS VENDIDOS POR CATEGORÍA (ACTUALIZADO)
app.get('/api/reports/books-by-category', async (req, res) => {
    try {
        console.log('🏆 Obteniendo libros más vendidos por categoría...');
        
        const categoriesResult = await pool.request()
            .query(`
                SELECT DISTINCT categoria 
                FROM Libros 
                WHERE categoria IS NOT NULL 
                    AND LTRIM(RTRIM(categoria)) != ''
                    AND estado IN ('Nuevo', 'Donado')
                ORDER BY categoria
            `);

        const categories = categoriesResult.recordset.map(row => row.categoria);
        console.log('📋 Categorías encontradas:', categories);
        
        const booksResult = await pool.request()
            .query(`
                WITH LibrosPorCategoria AS (
                    SELECT 
                        l.categoria,
                        l.titulo,
                        CONCAT(ISNULL(a.nombre, ''), ' ', ISNULL(a.apellido, '')) as autor,
                        l.estado,
                        ISNULL(SUM(df.cantidad), 0) as total_ventas,
                        ROW_NUMBER() OVER (PARTITION BY l.categoria ORDER BY ISNULL(SUM(df.cantidad), 0) DESC, l.titulo ASC) as ranking
                    FROM Libros l
                    LEFT JOIN Autores a ON l.idautor = a.idautor
                    LEFT JOIN Detallefactura df ON l.isbn = df.isbn_libro
                    LEFT JOIN Facturas f ON df.factura_id = f.id AND f.estado = 'Activa'
                    WHERE l.categoria IS NOT NULL 
                        AND LTRIM(RTRIM(l.categoria)) != ''
                        AND l.estado IN ('Nuevo', 'Donado')
                    GROUP BY l.categoria, l.titulo, a.nombre, a.apellido, l.estado
                )
                SELECT 
                    categoria,
                    titulo,
                    LTRIM(RTRIM(autor)) as autor,
                    estado,
                    total_ventas as ventas
                FROM LibrosPorCategoria
                WHERE ranking <= 3
                ORDER BY categoria, ranking
            `);

        console.log('📚 Libros por categoría encontrados:', booksResult.recordset.length);

        const booksByCategory = {};
        
        categories.forEach(category => {
            const categoryBooks = booksResult.recordset
                .filter(book => book.categoria === category)
                .map(book => ({
                    titulo: book.titulo,
                    autor: book.autor.trim() || 'Autor no asignado',
                    estado: book.estado,
                    ventas: book.ventas
                }));
            
            booksByCategory[category.toLowerCase()] = categoryBooks;
            console.log(`📖 Categoría "${category}": ${categoryBooks.length} libros`);
        });

        console.log(`✅ Procesadas ${categories.length} categorías`);
        
        res.json({
            categories: categories,
            books: booksByCategory
        });
        
    } catch (err) {
        console.error('❌ Error al obtener libros por categoría:', err);
        res.status(500).json({ 
            error: 'Error al obtener libros por categoría',
            details: err.message 
        });
    }
});

// 4. BEST SELLERS MÁS VENDIDOS (ACTUALIZADO)
app.get('/api/reports/best-sellers', async (req, res) => {
    try {
        console.log('⭐ Obteniendo best sellers más vendidos...');
        
        const result = await pool.request()
            .query(`
                SELECT TOP 10
                    l.titulo,
                    CONCAT(ISNULL(a.nombre, ''), ' ', ISNULL(a.apellido, '')) as autor,
                    l.categoria,
                    l.estado,
                    l.bestseller,
                    ISNULL(SUM(df.cantidad), 0) as ventas_totales,
                    ISNULL(AVG(df.precio_unitario), 0) as precio_promedio
                FROM Libros l
                LEFT JOIN Autores a ON l.idautor = a.idautor
                LEFT JOIN Detallefactura df ON l.isbn = df.isbn_libro
                LEFT JOIN Facturas f ON df.factura_id = f.id AND f.estado = 'Activa'
                WHERE l.estado IN ('Nuevo', 'Donado')
                GROUP BY l.titulo, a.nombre, a.apellido, l.categoria, l.estado, l.bestseller
                HAVING ISNULL(SUM(df.cantidad), 0) >= 0
                ORDER BY ISNULL(SUM(df.cantidad), 0) DESC, l.bestseller DESC
            `);

        console.log(`✅ Se encontraron ${result.recordset.length} best sellers`);
        
        const bestSellers = result.recordset.map(libro => ({
            titulo: libro.titulo,
            autor: libro.autor.trim() || 'Autor no asignado',
            categoria: libro.categoria || 'Sin categoría',
            estado: libro.estado,
            ventas_totales: libro.ventas_totales,
            precio_promedio: parseFloat(libro.precio_promedio).toFixed(2),
            es_bestseller: libro.bestseller === 1 ? 'Sí' : 'No'
        }));
        
        res.json(bestSellers);
        
    } catch (err) {
        console.error('❌ Error al obtener best sellers:', err);
        res.status(500).json({ 
            error: 'Error al obtener best sellers',
            details: err.message 
        });
    }
});

// 5. ACTIVIDAD RECIENTE (ACTUALIZADO)
app.get('/api/reports/recent-activity', async (req, res) => {
    try {
        console.log('🕒 Obteniendo actividad reciente...');
        
        const result = await pool.request()
            .query(`
                SELECT TOP 10 * FROM (
                    -- Facturas recientes
                    SELECT 
                        'factura' as tipo_actividad,
                        CONCAT('Factura #', numero_factura, ' emitida para ', cliente_nombre) as descripcion,
                        fecha_creacion as fecha
                    FROM Facturas
                    WHERE fecha_creacion >= DATEADD(DAY, -30, GETDATE())
                    
                    UNION ALL
                    
                    -- Libros agregados recientemente
                    SELECT 
                        'libro' as tipo_actividad,
                        CONCAT('Libro agregado: "', titulo, '" (', estado, ')') as descripcion,
                        fecha_publicacion as fecha
                    FROM Libros
                    WHERE fecha_publicacion >= DATEADD(DAY, -60, GETDATE())
                    
                    UNION ALL
                    
                    -- Simulación de actividad de autores
                    SELECT 
                        'autor' as tipo_actividad,
                        CONCAT('Nuevo autor registrado: ', nombre, ' ', apellido) as descripcion,
                        DATEADD(DAY, -ABS(CHECKSUM(NEWID()) % 30), GETDATE()) as fecha
                    FROM Autores
                    WHERE idautor > (SELECT MAX(idautor) - 5 FROM Autores)
                    
                ) actividades
                ORDER BY fecha DESC
            `);

        console.log(`✅ Se encontraron ${result.recordset.length} actividades recientes`);
        
        const actividades = result.recordset.map(actividad => ({
            tipo: actividad.tipo_actividad,
            descripcion: actividad.descripcion,
            fecha: actividad.fecha
        }));
        
        res.json(actividades);
        
    } catch (err) {
        console.error('❌ Error al obtener actividad reciente:', err);
        res.status(500).json({ 
            error: 'Error al obtener actividad reciente',
            details: err.message 
        });
    }
});

// 6. ESTADÍSTICAS DE LIBROS DE BAJA ROTACIÓN (ACTUALIZADO)
app.get('/api/reports/low-rotation-books/stats', async (req, res) => {
    try {
        console.log('📊 Obteniendo estadísticas de libros de baja rotación...');
        
        const result = await pool.request()
            .query(`
                WITH LibrosBajaRotacion AS (
                    SELECT 
                        l.isbn,
                        l.categoria,
                        l.estado,
                        ISNULL(ventas.cantidad_vendida, 0) as ventas_30_dias
                    FROM Libros l
                    LEFT JOIN (
                        SELECT 
                            df.isbn_libro,
                            SUM(df.cantidad) as cantidad_vendida
                        FROM Detallefactura df
                        INNER JOIN Facturas f ON df.factura_id = f.id
                        WHERE f.fecha_factura >= DATEADD(DAY, -30, GETDATE())
                            AND f.estado = 'Activa'
                        GROUP BY df.isbn_libro
                    ) ventas ON l.isbn = ventas.isbn_libro
                    WHERE l.estado IN ('Nuevo', 'Donado')
                        AND ISNULL(ventas.cantidad_vendida, 0) < 3
                )
                SELECT 
                    COUNT(*) as total_libros_baja_rotacion,
                    COUNT(CASE WHEN ventas_30_dias = 0 THEN 1 END) as sin_ventas,
                    COUNT(CASE WHEN ventas_30_dias = 1 THEN 1 END) as una_venta,
                    COUNT(CASE WHEN ventas_30_dias = 2 THEN 1 END) as dos_ventas,
                    COUNT(CASE WHEN estado = 'Nuevo' THEN 1 END) as libros_nuevos,
                    COUNT(CASE WHEN estado = 'Donado' THEN 1 END) as libros_donados,
                    AVG(CAST(ventas_30_dias as FLOAT)) as promedio_ventas,
                    COUNT(DISTINCT categoria) as categorias_afectadas
                FROM LibrosBajaRotacion
            `);

        const stats = result.recordset[0];
        
        const totalLibrosResult = await pool.request()
            .query(`SELECT COUNT(*) as total FROM Libros WHERE estado IN ('Nuevo', 'Donado')`);
        
        const totalLibros = totalLibrosResult.recordset[0].total;
        const porcentajeInventario = totalLibros > 0 ? 
            ((stats.total_libros_baja_rotacion / totalLibros) * 100).toFixed(1) : 0;
        
        res.json({
            total_libros_baja_rotacion: stats.total_libros_baja_rotacion,
            distribucion: {
                sin_ventas: stats.sin_ventas,
                una_venta: stats.una_venta,
                dos_ventas: stats.dos_ventas
            },
            distribucion_por_estado: {
                libros_nuevos: stats.libros_nuevos,
                libros_donados: stats.libros_donados
            },
            promedio_ventas: parseFloat(stats.promedio_ventas || 0).toFixed(2),
            categorias_afectadas: stats.categorias_afectadas,
            porcentaje_inventario: porcentajeInventario
        });
        
    } catch (err) {
        console.error('❌ Error al obtener estadísticas de baja rotación:', err);
        res.status(500).json({ 
            error: 'Error al obtener estadísticas de baja rotación',
            details: err.message 
        });
    }
});

// 7. FILTROS PARA LIBROS DE BAJA ROTACIÓN (ACTUALIZADO)
app.get('/api/reports/low-rotation-books/filters', async (req, res) => {
    try {
        const { categoria, min_precio, max_precio, estado, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        console.log('🔍 Filtros recibidos:', { categoria, min_precio, max_precio, estado, page });
        
        let whereConditions = [`l.estado IN ('Nuevo', 'Donado')`, `ISNULL(ventas.cantidad_vendida, 0) < 3`];
        let queryParams = [];
        
        if (categoria && categoria !== 'all') {
            whereConditions.push(`l.categoria = @categoria`);
            queryParams.push({ name: 'categoria', type: sql.NVarChar(50), value: categoria });
            console.log(`🔍 Filtrando por categoría exacta: "${categoria}"`);
        }
        
        if (estado && estado !== 'all') {
            whereConditions.push(`l.estado = @estado`);
            queryParams.push({ name: 'estado', type: sql.NVarChar(20), value: estado });
            console.log(`🔍 Filtrando por estado: "${estado}"`);
        }
        
        if (min_precio) {
            whereConditions.push(`l.precio >= @min_precio`);
            queryParams.push({ name: 'min_precio', type: sql.Decimal(10, 2), value: parseFloat(min_precio) });
        }
        
        if (max_precio) {
            whereConditions.push(`l.precio <= @max_precio`);
            queryParams.push({ name: 'max_precio', type: sql.Decimal(10, 2), value: parseFloat(max_precio) });
        }
        
        const whereClause = whereConditions.join(' AND ');
        console.log('🔍 WHERE clause:', whereClause);
        
        let countRequest = pool.request();
        queryParams.forEach(param => {
            countRequest.input(param.name, param.type, param.value);
        });
        
        const countResult = await countRequest.query(`
            SELECT COUNT(*) as total
            FROM Libros l
            LEFT JOIN (
                SELECT 
                    df.isbn_libro,
                    SUM(df.cantidad) as cantidad_vendida
                FROM Detallefactura df
                INNER JOIN Facturas f ON df.factura_id = f.id
                WHERE f.fecha_factura >= DATEADD(DAY, -30, GETDATE())
                    AND f.estado = 'Activa'
                GROUP BY df.isbn_libro
            ) ventas ON l.isbn = ventas.isbn_libro
            WHERE ${whereClause}
        `);
        
        const totalRecords = countResult.recordset[0].total;
        const totalPages = Math.ceil(totalRecords / parseInt(limit));
        
        console.log(`📊 Total de registros encontrados: ${totalRecords}`);
        
        let dataRequest = pool.request();
        queryParams.forEach(param => {
            dataRequest.input(param.name, param.type, param.value);
        });
        dataRequest.input('offset', sql.Int, offset);
        dataRequest.input('limit', sql.Int, parseInt(limit));
        
        const result = await dataRequest.query(`
            SELECT 
                l.isbn,
                l.titulo,
                CONCAT(ISNULL(a.nombre, ''), ' ', ISNULL(a.apellido, '')) as autor,
                l.categoria,
                l.precio,
                l.fecha_publicacion,
                l.estado,
                ISNULL(ventas.cantidad_vendida, 0) as ventas_30_dias
            FROM Libros l
            LEFT JOIN Autores a ON l.idautor = a.idautor
            LEFT JOIN (
                SELECT 
                    df.isbn_libro,
                    SUM(df.cantidad) as cantidad_vendida
                FROM Detallefactura df
                INNER JOIN Facturas f ON df.factura_id = f.id
                WHERE f.fecha_factura >= DATEADD(DAY, -30, GETDATE())
                    AND f.estado = 'Activa'
                GROUP BY df.isbn_libro
            ) ventas ON l.isbn = ventas.isbn_libro
            WHERE ${whereClause}
            ORDER BY ventas_30_dias ASC, l.titulo
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `);
        
        const librosFormateados = result.recordset.map(libro => ({
            isbn: libro.isbn,
            titulo: libro.titulo,
            autor: libro.autor.trim() || 'Autor no asignado',
            categoria: libro.categoria || 'Sin categoría',
            precio: parseFloat(libro.precio) || 0,
            fecha_publicacion: libro.fecha_publicacion,
            estado: libro.estado,
            ventas_30_dias: libro.ventas_30_dias
        }));
        
        console.log(`✅ Devolviendo ${librosFormateados.length} libros filtrados`);
        
        res.json({
            data: librosFormateados,
            filters_applied: {
                categoria: categoria || 'all',
                estado: estado || 'all',
                min_precio: min_precio || null,
                max_precio: max_precio || null
            },
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_records: totalRecords,
                per_page: parseInt(limit),
                has_next: parseInt(page) < totalPages,
                has_previous: parseInt(page) > 1,
                next_page: parseInt(page) < totalPages ? parseInt(page) + 1 : null,
                previous_page: parseInt(page) > 1 ? parseInt(page) - 1 : null
            }
        });
        
    } catch (err) {
        console.error('❌ Error al obtener libros filtrados:', err);
        res.status(500).json({ 
            error: 'Error al obtener libros de baja rotación con filtros',
            details: err.message
        });
    }
});

// 8. CATEGORÍAS DISPONIBLES (ACTUALIZADO)
app.get('/api/reports/categories', async (req, res) => {
    try {
        console.log('📚 Obteniendo lista de categorías disponibles...');
        
        const result = await pool.request()
            .query(`
                SELECT DISTINCT 
                    categoria,
                    COUNT(*) as total_libros,
                    COUNT(CASE WHEN estado = 'Nuevo' THEN 1 END) as libros_nuevos,
                    COUNT(CASE WHEN estado = 'Donado' THEN 1 END) as libros_donados
                FROM Libros 
                WHERE categoria IS NOT NULL 
                    AND LTRIM(RTRIM(categoria)) != ''
                    AND estado IN ('Nuevo', 'Donado')
                GROUP BY categoria
                ORDER BY categoria
            `);
        
        console.log(`✅ Categorías encontradas:`, result.recordset);
        
        res.json(result.recordset);
        
    } catch (err) {
        console.error('❌ Error al obtener categorías:', err);
        res.status(500).json({ 
            error: 'Error al obtener categorías',
            details: err.message 
        });
    }
});


// ===== FIN DE ENDPOINTS ACTUALIZADOS =====

// ===== RUTAS GENERALES =====

// Ruta para servir tu página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de prueba de conexión
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Servidor funcionando correctamente',
        database: 'Tienda_Libros',
        timestamp: new Date().toISOString()
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Dashboard disponible en: http://localhost:${PORT}`);
    console.log(`🔗 API disponible en: http://localhost:${PORT}/api`);
});

// Manejo de errores y cierre de conexión
process.on('SIGINT', async () => {
    console.log('\n🔌 Cerrando conexión a la base de datos...');
    if (pool) {
        await pool.close();
    }
    process.exit(0);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
    console.error('Error no manejado:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Excepción no capturada:', err);
    process.exit(1);
});
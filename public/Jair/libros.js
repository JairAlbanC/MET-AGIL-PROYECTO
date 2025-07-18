// libros.js - CON PAGINACIÓN Y FILTROS
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM cargado');
    cargarAutores();
    cargarEditoriales();
    mostrarLibros();

    const isbnInput = document.getElementById('isbn');
    if (isbnInput) {
        isbnInput.addEventListener('input', validarISBNTiempoReal);
        isbnInput.addEventListener('blur', validarISBNTiempoReal);
    }

    // Event listeners para filtros en tiempo real
    setupFiltros();
});

const formulario = document.getElementById('formLibros');
const tabla = document.getElementById('tabla-libros');
let librosGlobal = [];
let librosFiltrados = [];
let indiceEditar = null;

// ===== VARIABLES DE PAGINACIÓN =====
let paginaActual = 1;
const librosPorPagina = 15;
let totalPaginas = 0;

// ===== VARIABLES DE FILTROS =====
let filtrosActivos = {
    texto: '',
    categoria: '',
    tipo: '',
    estado: ''
};

// ===== FUNCIONES DE FILTROS =====
function setupFiltros() {
    const buscarTexto = document.getElementById('buscar-texto');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroTipo = document.getElementById('filtro-tipo');
    const filtroEstado = document.getElementById('filtro-estado');

    // Búsqueda en tiempo real (con debounce)
    let timeoutId;
    if (buscarTexto) {
        buscarTexto.addEventListener('input', function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                filtrosActivos.texto = this.value.toLowerCase().trim();
                aplicarFiltrosInternos();
            }, 300);
        });
    }

    // Filtros de select
    if (filtroCategoria) {
        filtroCategoria.addEventListener('change', function() {
            filtrosActivos.categoria = this.value;
            aplicarFiltrosInternos();
        });
    }

    if (filtroTipo) {
        filtroTipo.addEventListener('change', function() {
            filtrosActivos.tipo = this.value;
            aplicarFiltrosInternos();
        });
    }

    if (filtroEstado) {
        filtroEstado.addEventListener('change', function() {
            filtrosActivos.estado = this.value;
            aplicarFiltrosInternos();
        });
    }
}

function aplicarFiltrosInternos() {
    console.log('🔍 Aplicando filtros:', filtrosActivos);
    
    librosFiltrados = librosGlobal.filter(libro => {
        // Filtro por texto (título o autor)
        if (filtrosActivos.texto) {
            const textoLibro = (libro.titulo + ' ' + (libro.autor_nombre || '')).toLowerCase();
            if (!textoLibro.includes(filtrosActivos.texto)) {
                return false;
            }
        }

        // Filtro por categoría
        if (filtrosActivos.categoria && libro.categoria !== filtrosActivos.categoria) {
            return false;
        }

        // Filtro por tipo
        if (filtrosActivos.tipo && libro.tipo !== filtrosActivos.tipo) {
            return false;
        }

        // Filtro por estado
        if (filtrosActivos.estado && libro.estado !== filtrosActivos.estado) {
            return false;
        }

        return true;
    });

    // Resetear a página 1 cuando se aplican filtros
    paginaActual = 1;
    
    // Recalcular paginación con libros filtrados
    calcularTotalPaginas();
    mostrarLibrosPaginados();
    actualizarBotonesPaginacion();
    actualizarInfoPaginacion();
    actualizarInfoFiltros();
}

function aplicarFiltros() {
    // Esta función se puede usar para aplicar filtros manualmente
    aplicarFiltrosInternos();
}

function limpiarFiltros() {
    // Limpiar campos de filtro
    document.getElementById('buscar-texto').value = '';
    document.getElementById('filtro-categoria').value = '';
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-estado').value = '';
    
    // Resetear filtros activos
    filtrosActivos = {
        texto: '',
        categoria: '',
        tipo: '',
        estado: ''
    };
    
    // Mostrar todos los libros
    librosFiltrados = [...librosGlobal];
    paginaActual = 1;
    
    calcularTotalPaginas();
    mostrarLibrosPaginados();
    actualizarBotonesPaginacion();
    actualizarInfoPaginacion();
    actualizarInfoFiltros();
}

function actualizarInfoFiltros() {
    const infoFiltros = document.getElementById('info-filtros');
    if (!infoFiltros) return;

    const totalOriginal = librosGlobal.length;
    const totalFiltrado = librosFiltrados.length;
    
    if (totalFiltrado === totalOriginal) {
        infoFiltros.textContent = `Mostrando todos los ${totalOriginal} libros`;
    } else {
        infoFiltros.textContent = `Mostrando ${totalFiltrado} de ${totalOriginal} libros`;
        infoFiltros.style.color = '#007bff';
        infoFiltros.style.fontWeight = 'bold';
    }
}

// ===== FUNCIONES DE PAGINACIÓN MODIFICADAS =====
function calcularTotalPaginas() {
    totalPaginas = Math.ceil(librosFiltrados.length / librosPorPagina);
    return totalPaginas;
}

function obtenerLibrosPagina(pagina) {
    const inicio = (pagina - 1) * librosPorPagina;
    const fin = inicio + librosPorPagina;
    return librosFiltrados.slice(inicio, fin);
}

function actualizarInfoPaginacion() {
    const infoPaginacion = document.getElementById('info-paginacion');
    const inicio = (paginaActual - 1) * librosPorPagina + 1;
    const fin = Math.min(paginaActual * librosPorPagina, librosFiltrados.length);
    
    if (infoPaginacion) {
        if (librosFiltrados.length === 0) {
            infoPaginacion.textContent = 'No hay libros para mostrar';
        } else {
            infoPaginacion.textContent = `Mostrando ${inicio}-${fin} de ${librosFiltrados.length} libros`;
        }
    }
}

function actualizarBotonesPaginacion() {
    const btnAnterior = document.getElementById('btn-anterior');
    const btnSiguiente = document.getElementById('btn-siguiente');
    const spanPaginaActual = document.getElementById('pagina-actual');
    const spanTotalPaginas = document.getElementById('total-paginas');
    const inputPagina = document.getElementById('input-pagina');
    
    if (btnAnterior) {
        btnAnterior.disabled = paginaActual <= 1;
    }
    
    if (btnSiguiente) {
        btnSiguiente.disabled = paginaActual >= totalPaginas;
    }
    
    if (spanPaginaActual) {
        spanPaginaActual.textContent = paginaActual;
    }
    
    if (spanTotalPaginas) {
        spanTotalPaginas.textContent = totalPaginas;
    }
    
    if (inputPagina) {
        inputPagina.max = totalPaginas;
        inputPagina.placeholder = paginaActual.toString();
    }
}

function cambiarPagina(direccion) {
    if (direccion === 'anterior' && paginaActual > 1) {
        paginaActual--;
    } else if (direccion === 'siguiente' && paginaActual < totalPaginas) {
        paginaActual++;
    }
    
    mostrarLibrosPaginados();
    actualizarBotonesPaginacion();
    actualizarInfoPaginacion();
    
    // Scroll hacia la tabla
    document.querySelector('.lista-libros').scrollIntoView({ behavior: 'smooth' });
}

function irAPagina(pagina) {
    if (pagina >= 1 && pagina <= totalPaginas) {
        paginaActual = pagina;
        mostrarLibrosPaginados();
        actualizarBotonesPaginacion();
        actualizarInfoPaginacion();
    }
}

// ===== FUNCIÓN MODIFICADA PARA MOSTRAR LIBROS PAGINADOS =====
function mostrarLibrosPaginados() {
    console.log(`📄 Mostrando página ${paginaActual} de ${totalPaginas}`);
    
    // Limpiar tabla
    tabla.innerHTML = '';
    
    if (librosFiltrados.length === 0) {
        const filaVacia = document.createElement('tr');
        filaVacia.innerHTML = '<td colspan="12" style="text-align: center; padding: 20px;">No hay libros que coincidan con los filtros</td>';
        tabla.appendChild(filaVacia);
        return;
    }
    
    const librosPagina = obtenerLibrosPagina(paginaActual);
    
    librosPagina.forEach((libro, indexEnPagina) => {
        const indexGlobal = librosGlobal.findIndex(l => l.isbn === libro.isbn);
        const fila = document.createElement('tr');
        
        // Crear las celdas de datos (AGREGADA COLUMNA CANTIDAD)
        fila.innerHTML = `
            <td>${libro.isbn}</td>
            <td>${libro.titulo}</td>
            <td>${libro.editorial_nombre || libro.editorial_id || 'N/A'}</td>
            <td>${libro.autor_nombre || libro.autor_id || 'N/A'}</td>
            <td>${libro.tipo || 'N/A'}</td>
            <td>${libro.categoria || 'N/A'}</td>
            <td>${libro.anio_publicacion || 'N/A'}</td>
            <td>${libro.precio || '0.00'}</td>
            <td>${libro.cantidad || '0'}</td>
            <td>${libro.bestseller || 'No'}</td>
            <td>${libro.estado || 'N/A'}</td>
        `;

        // Crear celda de acción con botones
        const celdaAccion = document.createElement('td');
        celdaAccion.style.whiteSpace = 'nowrap';
        
        const botonEditar = document.createElement('button');
        botonEditar.textContent = 'Editar';
        botonEditar.className = 'editar';
        botonEditar.style.marginRight = '5px';
        botonEditar.addEventListener('click', function() {
            console.log('Editando libro en índice global:', indexGlobal);
            editarLibro(indexGlobal);
        });

        const botonEliminar = document.createElement('button');
        botonEliminar.textContent = 'Eliminar';
        botonEliminar.className = 'eliminar';
        botonEliminar.addEventListener('click', function() {
            console.log('Eliminando libro en índice global:', indexGlobal);
            eliminarLibro(indexGlobal);
        });

        celdaAccion.appendChild(botonEditar);
        celdaAccion.appendChild(botonEliminar);
        fila.appendChild(celdaAccion);
        tabla.appendChild(fila);
    });
    
    console.log(`📄 Página ${paginaActual}: Mostrando ${librosPagina.length} libros`);
}

// ===== FUNCIÓN PRINCIPAL MODIFICADA =====
async function mostrarLibros() {
    try {
        console.log('Cargando libros...');
        const response = await fetch('/api/libros');
        if (!response.ok) {
            throw new Error('Error al obtener libros');
        }
        
        librosGlobal = await response.json();
        librosFiltrados = [...librosGlobal]; // Inicializar libros filtrados
        console.log('Libros cargados:', librosGlobal.length);
        
        // Calcular paginación
        calcularTotalPaginas();
        
        // Si estamos en una página que ya no existe después de eliminar, ir a la última página
        if (paginaActual > totalPaginas && totalPaginas > 0) {
            paginaActual = totalPaginas;
        } else if (totalPaginas === 0) {
            paginaActual = 1;
        }
        
        // Mostrar libros de la página actual
        mostrarLibrosPaginados();
        
        // Actualizar controles de paginación
        actualizarBotonesPaginacion();
        actualizarInfoPaginacion();
        actualizarInfoFiltros();
        
        console.log(`✅ Tabla actualizada: ${librosGlobal.length} libros total, página ${paginaActual}/${totalPaginas}`);
        
    } catch (err) {
        console.error('Error al mostrar libros:', err);
        alert('Error al cargar los libros: ' + err.message);
    }
}

// Función para cargar autores desde la API
async function cargarAutores() {
    try {
        const response = await fetch('/api/autores');
        if (response.ok) {
            const autores = await response.json();
            const selectAutor = document.getElementById('autor');
            
            // Limpiar opciones existentes excepto la primera
            selectAutor.innerHTML = '<option value="">Seleccione</option>';
            
            autores.forEach(autor => {
                const option = document.createElement('option');
                option.value = autor.idautor;
                option.textContent = autor.nombre;
                selectAutor.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar autores:', error);
    }
}

// Función para cargar editoriales desde la API
async function cargarEditoriales() {
    try {
        const response = await fetch('/api/editoriales');
        if (response.ok) {
            const editoriales = await response.json();
            const selectEditorial = document.getElementById('editorial');
            
            // Limpiar opciones existentes excepto la primera
            selectEditorial.innerHTML = '<option value="">Seleccione</option>';
            
            editoriales.forEach(editorial => {
                const option = document.createElement('option');
                option.value = editorial.ideditorial;
                option.textContent = editorial.nombre;
                selectEditorial.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar editoriales:', error);
    }
}

// Función para validar ISBN en tiempo real
function validarISBNTiempoReal() {
    const isbn = document.getElementById('isbn').value.trim();
    const isbnError = document.getElementById('isbn-error');
    
    // Remover mensaje de error existente
    if (isbnError) {
        isbnError.remove();
    }
    
    if (isbn && (isbn.length < 10 || isbn.length > 13)) {
        mostrarErrorCampo('isbn', 'El ISBN debe tener entre 10 y 13 dígitos');
        return false;
    }
    
    return true;
}

// Función para mostrar errores en campos específicos
function mostrarErrorCampo(campoId, mensaje) {
    const campo = document.getElementById(campoId);
    const errorExistente = document.getElementById(campoId + '-error');
    
    if (errorExistente) {
        errorExistente.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.id = campoId + '-error';
    errorDiv.style.color = 'red';
    errorDiv.style.fontSize = '0.8em';
    errorDiv.style.marginTop = '5px';
    errorDiv.textContent = mensaje;
    
    campo.parentNode.appendChild(errorDiv);
}

// Función para limpiar mensajes de error
function limpiarMensajes() {
    const errores = document.querySelectorAll('[id$="-error"]');
    errores.forEach(error => error.remove());
}

// Función para validar el formulario completo
function validarFormulario() {
    limpiarMensajes();
    let esValido = true;
    
    // Validar ISBN
    const isbn = document.getElementById('isbn').value.trim();
    if (!isbn) {
        mostrarErrorCampo('isbn', 'El ISBN es obligatorio');
        esValido = false;
    } else if (isbn.length < 10 || isbn.length > 13) {
        mostrarErrorCampo('isbn', 'El ISBN debe tener entre 10 y 13 dígitos');
        esValido = false;
    }
    
    // Validar título
    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) {
        mostrarErrorCampo('titulo', 'El título es obligatorio');
        esValido = false;
    }
    
    // Validar tipo
    const tipo = document.getElementById('tipo').value.trim();
    if (!tipo) {
        mostrarErrorCampo('tipo', 'El tipo es obligatorio');
        esValido = false;
    }
    
    // Validar año
    const anio = document.getElementById('anio').value.trim();
    if (!anio) {
        mostrarErrorCampo('anio', 'El año de publicación es obligatorio');
        esValido = false;
    } else {
        const anioNum = parseInt(anio);
        if (anioNum < 1000 || anioNum > new Date().getFullYear()) {
            mostrarErrorCampo('anio', 'El año debe estar entre 1000 y ' + new Date().getFullYear());
            esValido = false;
        }
    }
    
    // Validar precio
    const precio = document.getElementById('precio').value.trim();
    if (precio && isNaN(parseFloat(precio))) {
        mostrarErrorCampo('precio', 'El precio debe ser un número válido');
        esValido = false;
    }
    
    // Validar cantidad
    const cantidad = document.getElementById('cantidad').value.trim();
    if (!cantidad) {
        mostrarErrorCampo('cantidad', 'La cantidad es obligatoria');
        esValido = false;
    } else {
        const cantidadNum = parseInt(cantidad);
        if (isNaN(cantidadNum) || cantidadNum < 0) {
            mostrarErrorCampo('cantidad', 'La cantidad debe ser un número entero mayor o igual a 0');
            esValido = false;
        }
    }
    
    return esValido;
}

// Función para verificar ISBN duplicado
async function isISBNDuplicado(isbn) {
    if (indiceEditar !== null) {
        const libroEditando = librosGlobal[indiceEditar];
        return librosGlobal.some((libro, i) => libro.isbn == isbn && i !== indiceEditar);
    }
    return librosGlobal.some(libro => libro.isbn == isbn);
}

// Event listener para el formulario
if (formulario) {
    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!validarFormulario()) {
            return;
        }

        const isbn = document.getElementById('isbn').value.trim();
        
        // Verificar ISBN duplicado
        if (await isISBNDuplicado(isbn)) {
            mostrarErrorCampo('isbn', 'Este ISBN ya está registrado');
            return;
        }

        const libro = {
            isbn: isbn,
            titulo: document.getElementById('titulo').value.trim(),
            editorial_id: document.getElementById('editorial').value.trim() || null,
            autor_id: document.getElementById('autor').value.trim() || null,
            tipo: document.getElementById('tipo').value.trim() || null,
            categoria: document.getElementById('categoria').value.trim() || null,
            anio_publicacion: parseInt(document.getElementById('anio').value.trim()) || null,
            precio: parseFloat(document.getElementById('precio').value.trim()) || null,
            cantidad: parseInt(document.getElementById('cantidad').value.trim()) || 0, // NUEVO CAMPO
            bestseller: document.getElementById('bestseller').value.trim(),
            estado: document.getElementById('estado').value.trim() || null
        };

        console.log('Enviando libro:', libro);

        try {
            let response;
            const botonSubmit = document.getElementById('registrar');
            botonSubmit.disabled = true;
            botonSubmit.textContent = 'Procesando...';

            if (indiceEditar !== null) {
                const libroId = librosGlobal[indiceEditar].isbn;
                response = await fetch(`/api/libros/${libroId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(libro)
                });
                
                if (response.ok) {
                    alert('Libro actualizado correctamente');
                    indiceEditar = null;
                    botonSubmit.textContent = 'Registrar Libro';
                }
            } else {
                response = await fetch('/api/libros', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(libro)
                });
                
                if (response.ok) {
                    alert('Libro registrado correctamente');
                    // Si es un nuevo libro, ir a la primera página para verlo
                    paginaActual = 1;
                }
            }

            if (!response.ok) {
                const error = await response.json();
                console.error('Error al guardar libro:', error);
                alert('Error al guardar libro: ' + (error.error || 'Error desconocido'));
                return;
            }

            formulario.reset();
            limpiarMensajes();
            mostrarLibros();

        } catch (err) {
            console.error('Error al enviar datos:', err);
            alert('Error de conexión: ' + err.message);
        } finally {
            const botonSubmit = document.getElementById('registrar');
            botonSubmit.disabled = false;
            if (indiceEditar === null) {
                botonSubmit.textContent = 'Registrar Libro';
            }
        }
    });
}

// Función para editar libro
function editarLibro(index) {
    console.log('Función editarLibro llamada con índice:', index);
    console.log('Libro a editar:', librosGlobal[index]);
    
    const libro = librosGlobal[index];
    if (!libro) {
        console.error('No se encontró el libro en el índice:', index);
        alert('Error: No se encontró el libro a editar');
        return;
    }

    limpiarMensajes();
    
    document.getElementById('isbn').value = libro.isbn || '';
    document.getElementById('titulo').value = libro.titulo || '';
    document.getElementById('editorial').value = libro.editorial_id || '';
    document.getElementById('autor').value = libro.autor_id || '';
    document.getElementById('tipo').value = libro.tipo || '';
    document.getElementById('categoria').value = libro.categoria || '';
    document.getElementById('anio').value = libro.anio_publicacion || '';
    document.getElementById('precio').value = libro.precio || '';
    document.getElementById('cantidad').value = libro.cantidad || '0'; // NUEVO CAMPO
    document.getElementById('bestseller').value = libro.bestseller || 'No';
    document.getElementById('estado').value = libro.estado || '';

    indiceEditar = index;

    const botonSubmit = document.getElementById('registrar');
    if (botonSubmit) {
        botonSubmit.textContent = 'Actualizar Libro';
    }

    // Scroll hacia el formulario
    document.querySelector('.formulario').scrollIntoView({ behavior: 'smooth' });
    
    console.log('Formulario rellenado para edición');
}

// Función para eliminar libro
async function eliminarLibro(index) {
    console.log('🗑️ Función eliminarLibro llamada con índice:', index);
    
    const libro = librosGlobal[index];
    if (!libro) {
        console.error('❌ No se encontró el libro en el índice:', index);
        alert('Error: No se encontró el libro a eliminar');
        return;
    }
    
    console.log('📚 Libro a eliminar:', libro);
    
    if (!confirm(`¿Está seguro de que desea eliminar el libro "${libro.titulo}"?\n\nISBN: ${libro.isbn}`)) {
        console.log('🚫 Eliminación cancelada por el usuario');
        return;
    }

    try {
        console.log('🔄 Enviando solicitud de eliminación para ISBN:', libro.isbn);
        
        const response = await fetch(`/api/libros/${libro.isbn}`, { 
            method: 'DELETE' 
        });
        
        console.log('📡 Respuesta del servidor:', response.status, response.statusText);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Error del servidor:', error);
            
            if (response.status === 400 && error.error.includes('referenciado')) {
                alert(`No se puede eliminar el libro "${libro.titulo}".\n\n${error.error}\n\n${error.details || ''}`);
            } else {
                alert(`Error al eliminar libro: ${error.error || 'Error desconocido'}`);
            }
            return;
        }
        
        const resultado = await response.json();
        console.log('✅ Libro eliminado exitosamente:', resultado);
        
        alert(`Libro "${resultado.titulo || libro.titulo}" eliminado correctamente`);
        
        // Recargar la tabla con paginación actualizada
        await mostrarLibros();
        
    } catch (err) {
        console.error('❌ Error de conexión al eliminar libro:', err);
        alert(`Error de conexión al eliminar libro: ${err.message}`);
    }
}

// Función para cancelar edición
function cancelarEdicion() {
    indiceEditar = null;
    formulario.reset();
    limpiarMensajes();
    
    const botonSubmit = document.getElementById('registrar');
    if (botonSubmit) {
        botonSubmit.textContent = 'Registrar Libro';
    }
}

// ===== FUNCIONES GLOBALES PARA LOS BOTONES DE PAGINACIÓN Y FILTROS =====
window.cambiarPagina = cambiarPagina;
window.irAPagina = irAPagina;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
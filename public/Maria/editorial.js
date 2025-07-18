document.addEventListener('DOMContentLoaded', () => {
    const formEditoriales = document.getElementById('formEditoriales');
    const editarFormEditoriales = document.getElementById('editarFormEditoriales');
    const tablaEditorialesBody = document.getElementById('tabla-editoriales');
    const seccionEditar = document.getElementById('seccionEditar');

    // URL base de la API
    const API_BASE_URL = '/api/editoriales';

    // --- Funciones de Utilidad para Validación ---
    function mostrarError(elementId, messageId, message) {
        const inputElement = document.getElementById(elementId);
        const errorMessageElement = document.getElementById(messageId);
        if (errorMessageElement && inputElement) {
            errorMessageElement.textContent = message;
            inputElement.classList.add('invalid');
        }
    }

    function ocultarError(elementId, messageId) {
        const inputElement = document.getElementById(elementId);
        const errorMessageElement = document.getElementById(messageId);
        if (errorMessageElement && inputElement) {
            errorMessageElement.textContent = '';
            inputElement.classList.remove('invalid');
        }
    }

    // --- Funciones de Validación Específicas ---
    function validarIdEditorial(id, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}ideditorial`, `error${prefix}IdEditorial`);

        if (!id) {
            mostrarError(`${prefix}ideditorial`, `error${prefix}IdEditorial`, 'El ID de la editorial es requerido.');
            return false;
        }
        if (!/^\d+$/.test(id)) {
            mostrarError(`${prefix}ideditorial`, `error${prefix}IdEditorial`, 'El ID debe ser numérico.');
            return false;
        }
        if (id.length < 1 || id.length > 19) {
            mostrarError(`${prefix}ideditorial`, `error${prefix}IdEditorial`, 'El ID debe tener hasta 19 dígitos.');
            return false;
        }
        return true;
    }

    function validarNombre(nombre, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}nombre`, `error${prefix}Nombre`);
        if (!nombre) {
            mostrarError(`${prefix}nombre`, `error${prefix}Nombre`, 'El nombre es requerido.');
            return false;
        }
        if (nombre.length < 2 || nombre.length > 100) {
            mostrarError(`${prefix}nombre`, `error${prefix}Nombre`, 'Debe tener entre 2 y 100 caracteres.');
            return false;
        }
        if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.,&'-]+$/.test(nombre)) {
            mostrarError(`${prefix}nombre`, `error${prefix}Nombre`, 'Caracteres inválidos en el nombre.');
            return false;
        }
        return true;
    }

    function validarIsbn(isbn, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}isbn`, `error${prefix}Isbn`);
        if (isbn && !/^\d{10,13}$/.test(isbn)) {
            mostrarError(`${prefix}isbn`, `error${prefix}Isbn`, 'El ISBN debe ser numérico y tener 10 o 13 dígitos.');
            return false;
        }
        return true;
    }

    function validarCantidad(cantidad, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}cantidad`, `error${prefix}Cantidad`);
        if (cantidad === '' || cantidad === null) {
            mostrarError(`${prefix}cantidad`, `error${prefix}Cantidad`, 'La cantidad de libros es requerida.');
            return false;
        }
        const numCantidad = parseInt(cantidad, 10);
        if (isNaN(numCantidad) || numCantidad < 0) {
            mostrarError(`${prefix}cantidad`, `error${prefix}Cantidad`, 'Debe ser un número entero no negativo.');
            return false;
        }
        return true;
    }

    function validarEmail(email, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}email`, `error${prefix}Email`);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            mostrarError(`${prefix}email`, `error${prefix}Email`, 'Formato de email inválido.');
            return false;
        }
        if (email && email.length > 100) {
            mostrarError(`${prefix}email`, `error${prefix}Email`, 'El email no puede exceder los 100 caracteres.');
            return false;
        }
        return true;
    }

    function validarTelefono(telefono, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}telefono`, `error${prefix}Telefono`);
        if (telefono && !/^\d{7,15}$/.test(telefono)) {
            mostrarError(`${prefix}telefono`, `error${prefix}Telefono`, 'El teléfono debe contener entre 7 y 15 dígitos.');
            return false;
        }
        return true;
    }

    function validarSitioWeb(sitioWeb, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}sitioWeb`, `error${prefix}SitioWeb`);
        if (!sitioWeb) {
            mostrarError(`${prefix}sitioWeb`, `error${prefix}SitioWeb`, 'El sitio web es requerido.');
            return false;
        }
        if (!/^https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?$/.test(sitioWeb)) {
            mostrarError(`${prefix}sitioWeb`, `error${prefix}SitioWeb`, 'Formato de URL inválido.');
            return false;
        }
        if (sitioWeb.length > 100) {
            mostrarError(`${prefix}sitioWeb`, `error${prefix}SitioWeb`, 'El sitio web no puede exceder los 100 caracteres.');
            return false;
        }
        return true;
    }

    function validarEstado(estado, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}estado`, `error${prefix}Estado`);
        if (!estado) {
            mostrarError(`${prefix}estado`, `error${prefix}Estado`, 'El estado es requerido.');
            return false;
        }
        return true;
    }

    // --- Validación Completa del Formulario de Registro ---
    function validarFormularioRegistro() {
        let esValido = true;

        const id = document.getElementById('ideditorial').value.trim();
        const nombre = document.getElementById('nombre').value.trim();
        const isbn = document.getElementById('isbn').value.trim();
        const cantidad = document.getElementById('cantidad').value;
        const email = document.getElementById('email').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const sitioWeb = document.getElementById('sitioWeb').value.trim();
        const estado = document.getElementById('estado').value.trim();

        if (!validarIdEditorial(id)) esValido = false;
        if (!validarNombre(nombre)) esValido = false;
        if (!validarIsbn(isbn)) esValido = false;
        if (!validarCantidad(cantidad)) esValido = false;
        if (!validarEmail(email)) esValido = false;
        if (!validarTelefono(telefono)) esValido = false;
        if (!validarSitioWeb(sitioWeb)) esValido = false;
        if (!validarEstado(estado)) esValido = false;

        return esValido;
    }

    // --- Validación Completa del Formulario de Edición ---
    function validarFormularioEdicion() {
        let esValido = true;

        const nombre = document.getElementById('editarNombre').value.trim();
        const isbn = document.getElementById('editarIsbn').value.trim();
        const cantidad = document.getElementById('editarCantidad').value;
        const email = document.getElementById('editarEmail').value.trim();
        const telefono = document.getElementById('editarTelefono').value.trim();
        const sitioWeb = document.getElementById('editarSitioWeb').value.trim();
        const estado = document.getElementById('editarEstado').value.trim();
        
        if (!validarNombre(nombre, true)) esValido = false;
        if (!validarIsbn(isbn, true)) esValido = false;
        if (!validarCantidad(cantidad, true)) esValido = false;
        if (!validarEmail(email, true)) esValido = false;
        if (!validarTelefono(telefono, true)) esValido = false;
        if (!validarSitioWeb(sitioWeb, true)) esValido = false;
        if (!validarEstado(estado, true)) esValido = false;

        return esValido;
    }

    // --- Función para cargar próximo ID ---
    async function cargarProximoId() {
        try {
            const response = await fetch(`${API_BASE_URL}/next-id`);
            if (response.ok) {
                const data = await response.json();
                document.getElementById('ideditorial').value = data.nextId;
            }
        } catch (error) {
            console.error('Error al cargar próximo ID:', error);
        }
    }

    // --- Funciones para interactuar con la API ---
    async function cargarEditoriales() {
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) {
                throw new Error(`Error al cargar editoriales: ${response.status}`);
            }
            const editoriales = await response.json();
            mostrarEditorialesEnTabla(editoriales);
        } catch (error) {
            console.error('Error al cargar editoriales:', error);
            tablaEditorialesBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: red;">Error al cargar editoriales</td></tr>';
        }
    }

    function mostrarEditorialesEnTabla(editoriales) {
        tablaEditorialesBody.innerHTML = '';
        
        if (editoriales.length === 0) {
            tablaEditorialesBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay editoriales registradas.</td></tr>';
            return;
        }

        editoriales.forEach(editorial => {
            const row = tablaEditorialesBody.insertRow();
            row.setAttribute('data-id', editorial.ideditorial);

            row.insertCell(0).textContent = editorial.ideditorial;
            row.insertCell(1).textContent = editorial.nombre;
            row.insertCell(2).textContent = editorial.isbn || 'N/A';
            row.insertCell(3).textContent = editorial.cantidad || 'N/A';
            row.insertCell(4).textContent = editorial.email || 'N/A';
            row.insertCell(5).textContent = editorial.telefono || 'N/A';
            row.insertCell(6).textContent = editorial.sitio_web;
            row.insertCell(7).textContent = editorial.estado;
            
            const accionCell = row.insertCell(8);
            accionCell.innerHTML = `
                <button class="btn-editar-fila" data-id="${editorial.ideditorial}">Editar</button>
                <button class="btn-eliminar-fila" data-id="${editorial.ideditorial}">Eliminar</button>
            `;
        });

        // Adjuntar listeners a los botones
        document.querySelectorAll('.btn-editar-fila').forEach(button => {
            button.addEventListener('click', (e) => editarEditorial(e.target.dataset.id));
        });
        document.querySelectorAll('.btn-eliminar-fila').forEach(button => {
            button.addEventListener('click', (e) => eliminarEditorial(e.target.dataset.id));
        });
    }

    // --- Funciones CRUD ---
    async function crearEditorial(editorialData) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editorialData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear editorial');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async function actualizarEditorial(id, editorialData) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editorialData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar editorial');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async function eliminarEditorial(id) {
        if (!confirm(`¿Estás seguro de que quieres eliminar esta editorial?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar editorial');
            }

            alert('Editorial eliminada exitosamente.');
            await cargarEditoriales();
        } catch (error) {
            console.error('Error al eliminar editorial:', error);
            alert('Error al eliminar editorial: ' + error.message);
        }
    }

    async function editarEditorial(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`);
            if (!response.ok) {
                throw new Error('Error al obtener datos de la editorial');
            }

            const editorial = await response.json();
            
            document.getElementById('editarIdEditorialHidden').value = editorial.ideditorial;
            document.getElementById('editarIdEditorial').value = editorial.ideditorial;
            document.getElementById('editarNombre').value = editorial.nombre;
            document.getElementById('editarIsbn').value = editorial.isbn || '';
            document.getElementById('editarCantidad').value = editorial.cantidad || '';
            document.getElementById('editarEmail').value = editorial.email || '';
            document.getElementById('editarTelefono').value = editorial.telefono || '';
            document.getElementById('editarSitioWeb').value = editorial.sitio_web || '';
            document.getElementById('editarEstado').value = editorial.estado || '';
            
            seccionEditar.style.display = 'block';
            window.scrollTo({ top: seccionEditar.offsetTop, behavior: 'smooth' });
        } catch (error) {
            console.error('Error al cargar editorial para edición:', error);
            alert('Error al cargar datos de la editorial: ' + error.message);
        }
    }

    // Función para cancelar la edición
    function cancelarEdicion() {
        seccionEditar.style.display = 'none';
        editarFormEditoriales.reset();
        ['editarIdEditorial', 'editarNombre', 'editarIsbn', 'editarCantidad', 'editarEmail', 'editarTelefono', 'editarSitioWeb', 'editarEstado'].forEach(id => {
            const errorElementId = `error${id.charAt(0).toUpperCase() + id.slice(1)}`;
            ocultarError(id, errorElementId);
        });
    }
    window.cancelarEdicion = cancelarEdicion;

    // --- Listeners de Eventos para Validación en Tiempo Real ---
    document.getElementById('ideditorial').addEventListener('input', (e) => validarIdEditorial(e.target.value));
    document.getElementById('nombre').addEventListener('input', (e) => validarNombre(e.target.value));
    document.getElementById('isbn').addEventListener('input', (e) => validarIsbn(e.target.value));
    document.getElementById('cantidad').addEventListener('input', (e) => validarCantidad(e.target.value));
    document.getElementById('email').addEventListener('input', (e) => validarEmail(e.target.value));
    document.getElementById('telefono').addEventListener('input', (e) => validarTelefono(e.target.value));
    document.getElementById('sitioWeb').addEventListener('input', (e) => validarSitioWeb(e.target.value));
    document.getElementById('estado').addEventListener('change', (e) => validarEstado(e.target.value));

    document.getElementById('editarNombre').addEventListener('input', (e) => validarNombre(e.target.value, true));
    document.getElementById('editarIsbn').addEventListener('input', (e) => validarIsbn(e.target.value, true));
    document.getElementById('editarCantidad').addEventListener('input', (e) => validarCantidad(e.target.value, true));
    document.getElementById('editarEmail').addEventListener('input', (e) => validarEmail(e.target.value, true));
    document.getElementById('editarTelefono').addEventListener('input', (e) => validarTelefono(e.target.value, true));
    document.getElementById('editarSitioWeb').addEventListener('input', (e) => validarSitioWeb(e.target.value, true));
    document.getElementById('editarEstado').addEventListener('change', (e) => validarEstado(e.target.value, true));

    // --- Listeners para Envío de Formularios ---
    formEditoriales.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (validarFormularioRegistro()) {
            const editorialData = {
                ideditorial: document.getElementById('ideditorial').value.trim(),
                nombre: document.getElementById('nombre').value.trim(),
                isbn: document.getElementById('isbn').value.trim(),
                cantidad: document.getElementById('cantidad').value,
                email: document.getElementById('email').value.trim(),
                telefono: document.getElementById('telefono').value.trim(),
                sitio_web: document.getElementById('sitioWeb').value.trim(),
                estado: document.getElementById('estado').value.trim()
            };

            try {
                await crearEditorial(editorialData);
                formEditoriales.reset();
                alert('Editorial registrada exitosamente!');
                await cargarEditoriales();
                await cargarProximoId(); // Cargar el próximo ID disponible
            } catch (error) {
                console.error('Error al registrar editorial:', error);
                alert('Error al registrar editorial: ' + error.message);
            }
        } else {
            alert('Por favor, corrige los errores en el formulario de registro.');
        }
    });

    editarFormEditoriales.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (validarFormularioEdicion()) {
            const idOriginal = document.getElementById('editarIdEditorialHidden').value;
            const editorialData = {
                nombre: document.getElementById('editarNombre').value.trim(),
                isbn: document.getElementById('editarIsbn').value.trim(),
                cantidad: document.getElementById('editarCantidad').value,
                email: document.getElementById('editarEmail').value.trim(),
                telefono: document.getElementById('editarTelefono').value.trim(),
                sitio_web: document.getElementById('editarSitioWeb').value.trim(),
                estado: document.getElementById('editarEstado').value.trim()
            };

            try {
                await actualizarEditorial(idOriginal, editorialData);
                cancelarEdicion();
                alert('Editorial actualizada exitosamente!');
                await cargarEditoriales();
            } catch (error) {
                console.error('Error al actualizar editorial:', error);
                alert('Error al actualizar editorial: ' + error.message);
            }
        } else {
            alert('Por favor, corrige los errores en el formulario de edición.');
        }
    });

    // Cargar editoriales al iniciar la página
    cargarEditoriales();
    cargarProximoId(); // Cargar el próximo ID disponible
});
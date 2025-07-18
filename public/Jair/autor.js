document.addEventListener('DOMContentLoaded', () => {
    const formAutores = document.getElementById('formAutores');
    const editarFormAutores = document.getElementById('editarFormAutores');
    const tablaAutoresBody = document.getElementById('tabla-autores');
    const seccionEditar = document.getElementById('seccionEditar');

    // URL base de la API
    const API_BASE_URL = '/api/autores';

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
    function validarIdAutor(idautor, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}idautor`, `error${prefix}Idautor`);

        if (!idautor) {
            mostrarError(`${prefix}idautor`, `error${prefix}Idautor`, 'El ID es requerido.');
            return false;
        }
        
        // Validar que sea numérico (bigint)
        if (!/^\d+$/.test(idautor)) {
            mostrarError(`${prefix}idautor`, `error${prefix}Idautor`, 'El ID debe ser numérico.');
            return false;
        }
        
        // Validar rango de bigint
        if (idautor.length > 19) {
            mostrarError(`${prefix}idautor`, `error${prefix}Idautor`, 'El ID es demasiado largo.');
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
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
            mostrarError(`${prefix}nombre`, `error${prefix}Nombre`, 'Solo letras y espacios permitidos.');
            return false;
        }
        return true;
    }

    function validarApellido(apellido, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}apellido`, `error${prefix}Apellido`);
        if (!apellido) {
            mostrarError(`${prefix}apellido`, `error${prefix}Apellido`, 'El apellido es requerido.');
            return false;
        }
        if (apellido.length < 2 || apellido.length > 100) {
            mostrarError(`${prefix}apellido`, `error${prefix}Apellido`, 'Debe tener entre 2 y 100 caracteres.');
            return false;
        }
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) {
            mostrarError(`${prefix}apellido`, `error${prefix}Apellido`, 'Solo letras y espacios permitidos.');
            return false;
        }
        return true;
    }

    function validarEmail(email, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}email`, `error${prefix}Email`);
        if (!email) {
            mostrarError(`${prefix}email`, `error${prefix}Email`, 'El email es requerido.');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            mostrarError(`${prefix}email`, `error${prefix}Email`, 'Formato de email inválido.');
            return false;
        }
        if (email.length > 100) {
            mostrarError(`${prefix}email`, `error${prefix}Email`, 'El email no puede exceder los 100 caracteres.');
            return false;
        }
        return true;
    }

    function validarTelefono(telefono, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}telefono`, `error${prefix}Telefono`);
        if (telefono && telefono.length > 15) {
            mostrarError(`${prefix}telefono`, `error${prefix}Telefono`, 'El teléfono no puede exceder los 15 caracteres.');
            return false;
        }
        if (telefono && !/^\d+$/.test(telefono)) {
            mostrarError(`${prefix}telefono`, `error${prefix}Telefono`, 'El teléfono debe contener solo números.');
            return false;
        }
        return true;
    }

    function validarEstado(estado, isEditing = false) {
        const prefix = isEditing ? 'editar' : '';
        ocultarError(`${prefix}estado`, `error${prefix}Estado`);
        if (estado && estado.length > 20) {
            mostrarError(`${prefix}estado`, `error${prefix}Estado`, 'El estado no puede exceder los 20 caracteres.');
            return false;
        }
        return true;
    }

    // --- Validación Completa del Formulario de Registro ---
    function validarFormularioRegistro() {
        let esValido = true;

        const idautor = document.getElementById('idautor').value.trim();
        const nombre = document.getElementById('nombre').value.trim();
        const apellido = document.getElementById('apellido').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const estado = document.getElementById('estado').value.trim();

        if (!validarIdAutor(idautor)) esValido = false;
        if (!validarNombre(nombre)) esValido = false;
        if (!validarApellido(apellido)) esValido = false;
        if (!validarEmail(email)) esValido = false;
        if (!validarTelefono(telefono)) esValido = false;
        if (!validarEstado(estado)) esValido = false;

        return esValido;
    }

    // --- Validación Completa del Formulario de Edición ---
    function validarFormularioEdicion() {
        let esValido = true;

        const nombre = document.getElementById('editarNombre').value.trim();
        const apellido = document.getElementById('editarApellido').value.trim();
        const email = document.getElementById('editarEmail').value.trim();
        const telefono = document.getElementById('editarTelefono').value.trim();
        const estado = document.getElementById('editarEstado').value.trim();
        
        if (!validarNombre(nombre, true)) esValido = false;
        if (!validarApellido(apellido, true)) esValido = false;
        if (!validarEmail(email, true)) esValido = false;
        if (!validarTelefono(telefono, true)) esValido = false;
        if (!validarEstado(estado, true)) esValido = false;

        return esValido;
    }

    // --- Función para cargar próximo ID ---
    async function cargarProximoId() {
        try {
            const response = await fetch(`${API_BASE_URL}/next-id`);
            if (response.ok) {
                const data = await response.json();
                document.getElementById('idautor').value = data.nextId;
            }
        } catch (error) {
            console.error('Error al cargar próximo ID:', error);
        }
    }

    // --- Funciones para interactuar con la API ---
    async function cargarAutores() {
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) {
                throw new Error(`Error al cargar autores: ${response.status}`);
            }
            const autores = await response.json();
            mostrarAutoresEnTabla(autores);
        } catch (error) {
            console.error('Error al cargar autores:', error);
            tablaAutoresBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar autores</td></tr>';
        }
    }

    function mostrarAutoresEnTabla(autores) {
        tablaAutoresBody.innerHTML = '';
        
        if (autores.length === 0) {
            tablaAutoresBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay autores registrados.</td></tr>';
            return;
        }

        autores.forEach(autor => {
            const row = tablaAutoresBody.insertRow();
            row.setAttribute('data-id', autor.idautor);

            row.insertCell(0).textContent = autor.idautor;
            row.insertCell(1).textContent = autor.nombre;
            row.insertCell(2).textContent = autor.apellido;
            row.insertCell(3).textContent = autor.email;
            row.insertCell(4).textContent = autor.telefono || 'N/A';
            row.insertCell(5).textContent = autor.estado || 'N/A';
            
            const accionCell = row.insertCell(6);
            accionCell.innerHTML = `
                <button class="btn-editar-fila" data-id="${autor.idautor}">Editar</button>
                <button class="btn-eliminar-fila" data-id="${autor.idautor}">Eliminar</button>
            `;
        });

        // Adjuntar listeners a los botones
        document.querySelectorAll('.btn-editar-fila').forEach(button => {
            button.addEventListener('click', (e) => editarAutor(e.target.dataset.id));
        });
        document.querySelectorAll('.btn-eliminar-fila').forEach(button => {
            button.addEventListener('click', (e) => eliminarAutor(e.target.dataset.id));
        });
    }

    // --- Funciones CRUD ---
    async function crearAutor(autorData) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(autorData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear autor');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async function actualizarAutor(id, autorData) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(autorData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar autor');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async function eliminarAutor(id) {
        if (!confirm(`¿Estás seguro de que quieres eliminar este autor?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar autor');
            }

            alert('Autor eliminado exitosamente.');
            await cargarAutores();
        } catch (error) {
            console.error('Error al eliminar autor:', error);
            alert('Error al eliminar autor: ' + error.message);
        }
    }

    async function editarAutor(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`);
            if (!response.ok) {
                throw new Error('Error al obtener datos del autor');
            }

            const autor = await response.json();
            
            document.getElementById('editarIdHidden').value = autor.idautor;
            document.getElementById('editarId').value = autor.idautor;
            document.getElementById('editarNombre').value = autor.nombre;
            document.getElementById('editarApellido').value = autor.apellido;
            document.getElementById('editarEmail').value = autor.email;
            document.getElementById('editarTelefono').value = autor.telefono || '';
            document.getElementById('editarEstado').value = autor.estado || '';
            
            seccionEditar.style.display = 'block';
            window.scrollTo({ top: seccionEditar.offsetTop, behavior: 'smooth' });
        } catch (error) {
            console.error('Error al cargar autor para edición:', error);
            alert('Error al cargar datos del autor: ' + error.message);
        }
    }

    // Función para cancelar la edición
    function cancelarEdicion() {
        seccionEditar.style.display = 'none';
        editarFormAutores.reset();
        ['editarNombre', 'editarApellido', 'editarEmail', 'editarTelefono', 'editarEstado'].forEach(id => {
            const errorElementId = `error${id.charAt(0).toUpperCase() + id.slice(1)}`;
            ocultarError(id, errorElementId);
        });
    }
    window.cancelarEdicion = cancelarEdicion;

    // --- Listeners de Eventos para Validación en Tiempo Real ---
    document.getElementById('idautor').addEventListener('input', (e) => validarIdAutor(e.target.value));
    document.getElementById('nombre').addEventListener('input', (e) => validarNombre(e.target.value));
    document.getElementById('apellido').addEventListener('input', (e) => validarApellido(e.target.value));
    document.getElementById('email').addEventListener('input', (e) => validarEmail(e.target.value));
    document.getElementById('telefono').addEventListener('input', (e) => validarTelefono(e.target.value));
    document.getElementById('estado').addEventListener('input', (e) => validarEstado(e.target.value));

    document.getElementById('editarNombre').addEventListener('input', (e) => validarNombre(e.target.value, true));
    document.getElementById('editarApellido').addEventListener('input', (e) => validarApellido(e.target.value, true));
    document.getElementById('editarEmail').addEventListener('input', (e) => validarEmail(e.target.value, true));
    document.getElementById('editarTelefono').addEventListener('input', (e) => validarTelefono(e.target.value, true));
    document.getElementById('editarEstado').addEventListener('input', (e) => validarEstado(e.target.value, true));

    // --- Listeners para Envío de Formularios ---
    formAutores.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (validarFormularioRegistro()) {
            const autorData = {
                idautor: document.getElementById('idautor').value.trim(),
                nombre: document.getElementById('nombre').value.trim(),
                apellido: document.getElementById('apellido').value.trim(),
                email: document.getElementById('email').value.trim(),
                telefono: document.getElementById('telefono').value.trim(),
                estado: document.getElementById('estado').value.trim()
            };

            try {
                await crearAutor(autorData);
                formAutores.reset();
                alert('Autor registrado exitosamente!');
                await cargarAutores();
                await cargarProximoId(); // Cargar el próximo ID disponible
            } catch (error) {
                console.error('Error al registrar autor:', error);
                alert('Error al registrar autor: ' + error.message);
            }
        } else {
            alert('Por favor, corrige los errores en el formulario de registro.');
        }
    });

    editarFormAutores.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (validarFormularioEdicion()) {
            const idOriginal = document.getElementById('editarIdHidden').value;
            const autorData = {
                nombre: document.getElementById('editarNombre').value.trim(),
                apellido: document.getElementById('editarApellido').value.trim(),
                email: document.getElementById('editarEmail').value.trim(),
                telefono: document.getElementById('editarTelefono').value.trim(),
                estado: document.getElementById('editarEstado').value.trim()
            };

            try {
                await actualizarAutor(idOriginal, autorData);
                cancelarEdicion();
                alert('Autor actualizado exitosamente!');
                await cargarAutores();
            } catch (error) {
                console.error('Error al actualizar autor:', error);
                alert('Error al actualizar autor: ' + error.message);
            }
        } else {
            alert('Por favor, corrige los errores en el formulario de edición.');
        }
    });

    // Cargar autores al iniciar la página
    cargarAutores();
    cargarProximoId(); // Cargar el próximo ID disponible
});
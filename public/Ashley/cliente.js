let clientes = [];

// Función para validar email
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.com$/;
    return regex.test(email);
}

// Función para mostrar error de email
function mostrarErrorEmail(inputId, errorId, mensaje) {
    const errorDiv = document.getElementById(errorId);
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    document.getElementById(inputId).style.border = '1px solid red';
}

// Función para ocultar error de email
function ocultarErrorEmail(inputId, errorId) {
    const errorDiv = document.getElementById(errorId);
    errorDiv.style.display = 'none';
    document.getElementById(inputId).style.border = '';
}

// Función para obtener el valor del select
function obtenerEstadoSeleccionado(selectId) {
    return document.getElementById(selectId).value;
}

// Función para establecer el valor del select
function establecerEstado(selectId, valor) {
    document.getElementById(selectId).value = valor;
}

// Función para mostrar mensaje de éxito
function mostrarMensaje(mensaje, tipo = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        max-width: 300px;
        background-color: ${tipo === 'success' ? '#28a745' : '#dc3545'};
    `;
    alertDiv.textContent = mensaje;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        document.body.removeChild(alertDiv);
    }, 3000);
}

// Cargar clientes al iniciar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarClientes();
});

// Función para cargar clientes desde la API
async function cargarClientes() {
    try {
        console.log('📥 Cargando clientes desde la base de datos...');
        
        const response = await fetch('/api/clientes');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        clientes = await response.json();
        console.log('✅ Clientes cargados:', clientes.length);
        
        mostrarClientes();
        
    } catch (error) {
        console.error('❌ Error al cargar clientes:', error);
        mostrarMensaje('Error al cargar los clientes: ' + error.message, 'error');
    }
}

// Función para registrar cliente en la API
async function registrarCliente(clienteData) {
    try {
        console.log('📤 Enviando cliente a la API:', clienteData);
        
        const response = await fetch('/api/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(clienteData)
        });

        // Verificar si la respuesta es JSON válido
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            console.error('❌ Respuesta no es JSON:', textResponse);
            throw new Error('El servidor no devolvió una respuesta JSON válida. Verifica que las rutas estén configuradas correctamente.');
        }

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Error HTTP: ${response.status}`);
        }

        console.log('✅ Cliente registrado exitosamente:', result);
        mostrarMensaje('Cliente registrado exitosamente');
        
        // Recargar la lista de clientes
        await cargarClientes();
        
        return result;
        
    } catch (error) {
        console.error('❌ Error al registrar cliente:', error);
        
        // Mensajes de error más específicos
        if (error.message.includes('404')) {
            mostrarMensaje('Error: Ruta no encontrada. Verifica que el servidor esté configurado correctamente.', 'error');
        } else if (error.message.includes('JSON')) {
            mostrarMensaje('Error de comunicación con el servidor. Verifica la configuración.', 'error');
        } else {
            mostrarMensaje('Error al registrar cliente: ' + error.message, 'error');
        }
        throw error;
    }
}

// Función para actualizar cliente en la API
async function actualizarCliente(id, clienteData) {
    try {
        console.log('📤 Actualizando cliente en la API:', id, clienteData);
        
        const response = await fetch(`/api/clientes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(clienteData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error al actualizar cliente');
        }

        console.log('✅ Cliente actualizado exitosamente:', result);
        mostrarMensaje('Cliente actualizado exitosamente');
        
        // Recargar la lista de clientes
        await cargarClientes();
        
        return result;
        
    } catch (error) {
        console.error('❌ Error al actualizar cliente:', error);
        mostrarMensaje('Error al actualizar cliente: ' + error.message, 'error');
        throw error;
    }
}

// Función para eliminar cliente de la API
async function eliminarClienteAPI(id) {
    try {
        console.log('🗑️ Eliminando cliente de la API:', id);
        
        const response = await fetch(`/api/clientes/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error al eliminar cliente');
        }

        console.log('✅ Cliente eliminado exitosamente:', result);
        mostrarMensaje('Cliente eliminado exitosamente');
        
        // Recargar la lista de clientes
        await cargarClientes();
        
        return result;
        
    } catch (error) {
        console.error('❌ Error al eliminar cliente:', error);
        mostrarMensaje('Error al eliminar cliente: ' + error.message, 'error');
        throw error;
    }
}

// Event listener para el formulario de registro
document.getElementById("clienteForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    
    // Validar email
    if (!validarEmail(email)) {
        mostrarErrorEmail('email', 'emailError', 'El email debe contener @ y terminar en .com');
        return;
    }

    ocultarErrorEmail('email', 'emailError');

    const clienteData = {
        cedula: document.getElementById("cedula").value,
        nombre: document.getElementById("nombre").value,
        apellido: document.getElementById("apellido").value,
        telefono: document.getElementById("telefono").value,
        direccion: document.getElementById("direccion").value,
        email: email,
        estado: obtenerEstadoSeleccionado('estado')
    };

    try {
        await registrarCliente(clienteData);
        this.reset();
    } catch (error) {
        // El error ya se maneja en registrarCliente
    }
});

// Event listener para el formulario de edición
document.getElementById("editarForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("editarEmail").value;
    
    // Validar email
    if (!validarEmail(email)) {
        mostrarErrorEmail('editarEmail', 'editarEmailError', 'El email debe contener @ y terminar en .com');
        return;
    }

    ocultarErrorEmail('editarEmail', 'editarEmailError');

    const id = document.getElementById("editarIdcliente").value;

    const clienteData = {
        cedula: document.getElementById("editarCedula").value,
        nombre: document.getElementById("editarNombre").value,
        apellido: document.getElementById("editarApellido").value,
        telefono: document.getElementById("editarTelefono").value,
        direccion: document.getElementById("editarDireccion").value,
        email: email,
        estado: obtenerEstadoSeleccionado('editarEstado')
    };

    try {
        await actualizarCliente(id, clienteData);
        this.reset();
        document.getElementById("seccionEditar").style.display = "none";
    } catch (error) {
        // El error ya se maneja en actualizarCliente
    }
});

// Event listeners para limpiar errores cuando se escribe en el email
document.getElementById("email").addEventListener("input", function() {
    ocultarErrorEmail('email', 'emailError');
});

document.getElementById("editarEmail").addEventListener("input", function() {
    ocultarErrorEmail('editarEmail', 'editarEmailError');
});

function mostrarClientes() {
    const tabla = document.getElementById("clienteTabla");
    tabla.innerHTML = "";

    clientes.forEach(cli => {
        // Formatear la fecha si existe
        let fechaFormateada = 'N/A';
        if (cli.fecha_registro) {
            const fecha = new Date(cli.fecha_registro);
            fechaFormateada = fecha.toLocaleDateString();
        }

        tabla.innerHTML += `
            <tr>
                <td><input type="radio" name="seleccionCliente" value="${cli.id}"></td>
                <td>${cli.id}</td>
                <td>${cli.cedula || 'N/A'}</td>
                <td>${cli.nombre || 'N/A'}</td>
                <td>${cli.apellido || 'N/A'}</td>
                <td>${cli.telefono || 'N/A'}</td>
                <td>${cli.direccion || 'N/A'}</td>
                <td>${cli.email || 'N/A'}</td>
                <td>${fechaFormateada}</td>
                <td>${cli.estado || 'N/A'}</td>
            </tr>`;
    });
}

function obtenerClienteSeleccionado() {
    const seleccionado = document.querySelector('input[name="seleccionCliente"]:checked');
    return seleccionado ? Number(seleccionado.value) : null;
}

function editarSeleccionado() {
    const id = obtenerClienteSeleccionado();
    if (!id) {
        alert("Por favor seleccione un cliente.");
        return;
    }
    editar(id);
}

async function eliminarSeleccionado() {
    const id = obtenerClienteSeleccionado();
    if (!id) {
        alert("Por favor seleccione un cliente.");
        return;
    }
    
    const cliente = clientes.find(c => c.id === id);
    const nombreCompleto = cliente ? `${cliente.nombre} ${cliente.apellido}` : 'el cliente seleccionado';
    
    if (confirm(`¿Está seguro de que desea eliminar a ${nombreCompleto}?`)) {
        try {
            await eliminarClienteAPI(id);
        } catch (error) {
            // El error ya se maneja en eliminarClienteAPI
        }
    }
}

function editar(id) {
    const cli = clientes.find(c => c.id === id);
    if (!cli) return;

    document.getElementById("editarIdcliente").value = cli.id;
    document.getElementById("editarCedula").value = cli.cedula || '';
    document.getElementById("editarNombre").value = cli.nombre || '';
    document.getElementById("editarApellido").value = cli.apellido || '';
    document.getElementById("editarTelefono").value = cli.telefono || '';
    document.getElementById("editarDireccion").value = cli.direccion || '';
    document.getElementById("editarEmail").value = cli.email || '';
    establecerEstado('editarEstado', cli.estado || '');

    document.getElementById("seccionEditar").style.display = "block";
    window.scrollTo(0, document.getElementById("seccionEditar").offsetTop);
}

function cancelarEdicion() {
    document.getElementById("editarForm").reset();
    document.getElementById("seccionEditar").style.display = "none";
    ocultarErrorEmail('editarEmail', 'editarEmailError');
}

// ===== FACTURA.JS - VERSIÓN COMPLETAMENTE CORREGIDA CON VALIDACIÓN DE CÉDULA =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando sistema de facturas...');

    // ===== REFERENCIAS A ELEMENTOS DEL DOM =====
    const clientCedulaInput = document.getElementById('clientCedula');
    const clientNameInput = document.getElementById('clientName');
    const clientLastNameInput = document.getElementById('clientLastName');
    const clientPhoneInput = document.getElementById('clientPhone');
    const clientEmailInput = document.getElementById('clientEmail');
    const clientAddressInput = document.getElementById('clientAddress');
    const cedulaStatus = document.getElementById('cedula-status');
    
    const isbnInput = document.getElementById('isbn');
    const libroSelect = document.getElementById('libro');
    const precioUnitarioInput = document.getElementById('precioUnitario');
    const addItemBtn = document.getElementById('addItemBtn');
    const invoiceItemsTableBody = document.getElementById('invoiceItemsTableBody');
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const invoiceNumberInput = document.getElementById('invoiceNumber');
    const facturasTableBody = document.getElementById('facturasTableBody');
    
    // Elementos de botones
    const btnRefrescar = document.getElementById('btnRefrescar');
    
    // ===== VARIABLES GLOBALES =====
    let invoiceItems = [];
    let itemCounter = 1;
    let librosDisponibles = [];
    let facturasGeneradas = [];
    let clienteEncontrado = false;

    // ===== INICIALIZACIÓN =====
    async function inicializar() {
        try {
            console.log('📚 Cargando datos iniciales...');
            
            // Cargar libros disponibles
            await cargarLibrosDisponibles();
            
            // Limpiar campo de número de factura
            if (invoiceNumberInput) {
                invoiceNumberInput.value = 'Se generará automáticamente';
            }
            
            // Configurar ID detalle automático
            const primerIdDetalle = `DET-${String(itemCounter).padStart(3, '0')}`;
            const idDetalleInput = document.getElementById('idDetalle');
            if (idDetalleInput) {
                idDetalleInput.value = primerIdDetalle;
                idDetalleInput.readOnly = true;
                idDetalleInput.style.backgroundColor = '#f8f9fa';
                idDetalleInput.style.color = '#6c757d';
            }
            
            // Establecer fecha actual automáticamente
            const fechaInput = document.getElementById('invoiceDate');
            if (fechaInput) {
                const hoy = new Date().toISOString().split('T')[0];
                fechaInput.value = hoy;
            }
            
            // Cargar facturas existentes
            await cargarFacturasGeneradas();
            
            console.log('✅ Sistema de facturas inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar:', error);
            mostrarMensajeError('Error al inicializar el sistema');
        }
    }

    // ===== FUNCIONES PARA MANEJAR CÉDULA Y CLIENTES - ACTUALIZADO =====

    // ===== VALIDACIÓN COMPLETA DE CÉDULA ECUATORIANA =====
    function validarCedulaEcuatoriana(cedula) {
        // Verificar que tenga exactamente 10 dígitos
        if (!cedula || cedula.length !== 10) {
            return false;
        }
        
        // Verificar que solo contenga números
        if (!/^[0-9]+$/.test(cedula)) {
            return false;
        }
        
        // Convertir a array de números
        const digitos = cedula.split("").map(Number);
        
        // Verificar que los primeros dos dígitos correspondan a una provincia válida (01-24)
        const codigoProvincia = parseInt(cedula.substring(0, 2));
        if (codigoProvincia < 1 || codigoProvincia > 24) {
            return false;
        }
        
        // Verificar que el tercer dígito sea menor a 6 (para personas naturales)
        if (digitos[2] >= 6) {
            return false;
        }
        
        // Algoritmo de validación del dígito verificador
        let suma = 0;
        const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        
        for (let i = 0; i < 9; i++) {
            let resultado = digitos[i] * coeficientes[i];
            if (resultado > 9) {
                resultado = resultado - 9;
            }
            suma += resultado;
        }
        
        const residuo = suma % 10;
        const digitoVerificador = residuo === 0 ? 0 : 10 - residuo;
        
        return digitoVerificador === digitos[9];
    }

    // ===== FUNCIÓN VALIDAR CÉDULA ACTUALIZADA =====
    function validarCedula(cedula) {
        // Usar la validación completa ecuatoriana
        return validarCedulaEcuatoriana(cedula);
    }

    // ===== FUNCIÓN PARA MOSTRAR DETALLES DE VALIDACIÓN =====
    function obtenerDetallesValidacionCedula(cedula) {
        if (!cedula) {
            return "Cédula vacía";
        }
        
        if (cedula.length !== 10) {
            return `Debe tener exactamente 10 dígitos (actual: ${cedula.length})`;
        }
        
        if (!/^[0-9]+$/.test(cedula)) {
            return "Solo debe contener números";
        }
        
        const codigoProvincia = parseInt(cedula.substring(0, 2));
        if (codigoProvincia < 1 || codigoProvincia > 24) {
            return `Código de provincia inválido: ${codigoProvincia.toString().padStart(2, '0')} (debe ser 01-24)`;
        }
        
        const tercerDigito = parseInt(cedula[2]);
        if (tercerDigito >= 6) {
            return `Tercer dígito inválido: ${tercerDigito} (debe ser 0-5 para personas naturales)`;
        }
        
        // Verificar dígito verificador
        const digitos = cedula.split("").map(Number);
        let suma = 0;
        const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        
        for (let i = 0; i < 9; i++) {
            let resultado = digitos[i] * coeficientes[i];
            if (resultado > 9) {
                resultado = resultado - 9;
            }
            suma += resultado;
        }
        
        const residuo = suma % 10;
        const digitoVerificadorCalculado = residuo === 0 ? 0 : 10 - residuo;
        const digitoVerificadorReal = digitos[9];
        
        if (digitoVerificadorCalculado !== digitoVerificadorReal) {
            return `Dígito verificador incorrecto: esperado ${digitoVerificadorCalculado}, encontrado ${digitoVerificadorReal}`;
        }
        
        return "Cédula válida";
    }

    // ===== FUNCIÓN PARA OBTENER NOMBRE DE PROVINCIA =====
    function obtenerNombreProvincia(cedula) {
        if (!cedula || cedula.length < 2) return "Desconocida";
        
        const codigoProvincia = parseInt(cedula.substring(0, 2));
        const provincias = {
            1: "Azuay", 2: "Bolívar", 3: "Cañar", 4: "Carchi", 5: "Cotopaxi",
            6: "Chimborazo", 7: "El Oro", 8: "Esmeraldas", 9: "Guayas", 10: "Imbabura",
            11: "Loja", 12: "Los Ríos", 13: "Manabí", 14: "Morona Santiago", 15: "Napo",
            16: "Pastaza", 17: "Pichincha", 18: "Tungurahua", 19: "Zamora Chinchipe",
            20: "Galápagos", 21: "Sucumbíos", 22: "Orellana", 23: "Santo Domingo de los Tsáchilas",
            24: "Santa Elena"
        };
        
        return provincias[codigoProvincia] || "Provincia inválida";
    }

    // ===== FUNCIÓN ACTUALIZADA PARA MOSTRAR ERROR DE CÉDULA =====
    function mostrarErrorCedula(mensaje) {
        mostrarEstadoCedula(mensaje, 'error');
        if (clientCedulaInput) {
            clientCedulaInput.style.borderColor = 'red';
            clientCedulaInput.style.borderWidth = '2px';
        }
    }

    function ocultarErrorCedula() {
        if (clientCedulaInput) {
            clientCedulaInput.style.borderColor = '#ddd';
            clientCedulaInput.style.borderWidth = '1px';
        }
    }

    // ===== FUNCIÓN ACTUALIZADA PARA BUSCAR CLIENTE POR CÉDULA =====
    async function buscarClientePorCedula(cedula) {
        if (!cedula) {
            limpiarDatosCliente();
            mostrarEstadoCedula('', 'neutral');
            return;
        }

        // Validación completa con detalles
        if (!validarCedula(cedula)) {
            limpiarDatosCliente();
            const detalleError = obtenerDetallesValidacionCedula(cedula);
            mostrarErrorCedula(`❌ ${detalleError}`);
            return;
        }

        // Mostrar información adicional de la cédula válida
        const provincia = obtenerNombreProvincia(cedula);
        console.log(`🔍 Buscando cliente con cédula: ${cedula} (Provincia: ${provincia})`);
        mostrarEstadoCedula(`Buscando cliente... (${provincia})`, 'loading');
        ocultarErrorCedula();

        try {
            const response = await fetch(`/api/clientes/cedula/${cedula}`);
            
            if (response.ok) {
                const cliente = await response.json();
                console.log('✅ Cliente encontrado:', cliente);
                mostrarDatosCliente(cliente);
                mostrarEstadoCedula(`✅ Cliente encontrado: ${cliente.nombre} ${cliente.apellido} (${provincia})`, 'success');
                clienteEncontrado = true;
            } else if (response.status === 404) {
                console.log('❌ Cliente no encontrado con cédula:', cedula);
                limpiarDatosCliente();
                mostrarEstadoCedula(`❌ Cliente no encontrado. Cédula válida de ${provincia}. Complete los datos para registrar nuevo cliente.`, 'warning');
                clienteEncontrado = false;
                habilitarCamposCliente();
            } else {
                throw new Error('Error del servidor');
            }
        } catch (error) {
            console.error('❌ Error al buscar cliente:', error);
            mostrarEstadoCedula('❌ Error al buscar cliente. Complete los datos manualmente.', 'error');
            clienteEncontrado = false;
            habilitarCamposCliente();
        }
    }

    function mostrarDatosCliente(cliente) {
        if (clientNameInput) clientNameInput.value = cliente.nombre || '';
        if (clientLastNameInput) clientLastNameInput.value = cliente.apellido || '';
        if (clientPhoneInput) clientPhoneInput.value = cliente.telefono || '';
        if (clientEmailInput) clientEmailInput.value = cliente.email || '';
        if (clientAddressInput) clientAddressInput.value = cliente.direccion || '';
        
        deshabilitarCamposCliente();
        clienteEncontrado = true;
    }

    function limpiarDatosCliente() {
        if (clientNameInput) clientNameInput.value = '';
        if (clientLastNameInput) clientLastNameInput.value = '';
        if (clientPhoneInput) clientPhoneInput.value = '';
        if (clientEmailInput) clientEmailInput.value = '';
        if (clientAddressInput) clientAddressInput.value = '';
        clienteEncontrado = false;
        habilitarCamposCliente();
    }

    function deshabilitarCamposCliente() {
        const campos = [clientNameInput, clientLastNameInput, clientPhoneInput, clientEmailInput, clientAddressInput];
        campos.forEach(campo => {
            if (campo) {
                campo.style.backgroundColor = '#f8f9fa';
                campo.readOnly = true;
            }
        });
    }

    function habilitarCamposCliente() {
        const campos = [clientNameInput, clientLastNameInput, clientPhoneInput, clientEmailInput, clientAddressInput];
        campos.forEach(campo => {
            if (campo) {
                campo.style.backgroundColor = '';
                campo.readOnly = false;
            }
        });
    }

    function mostrarEstadoCedula(mensaje, tipo) {
        if (!cedulaStatus) return;
        
        cedulaStatus.textContent = mensaje;
        cedulaStatus.className = '';
        
        switch (tipo) {
            case 'success':
                cedulaStatus.style.color = 'green';
                break;
            case 'error':
                cedulaStatus.style.color = 'red';
                break;
            case 'warning':
                cedulaStatus.style.color = 'orange';
                break;
            case 'loading':
                cedulaStatus.style.color = 'blue';
                break;
            default:
                cedulaStatus.style.color = '#6c757d';
        }
    }

    // ===== FUNCIÓN ACTUALIZADA PARA GUARDAR NUEVO CLIENTE =====
    async function guardarNuevoCliente(datosCliente) {
        try {
            console.log('💾 Guardando nuevo cliente:', datosCliente);
            
            limpiarErroresCampos();
            
            let hayErrores = false;

            // Validación completa de cédula
            if (!datosCliente.cedula || !validarCedula(datosCliente.cedula)) {
                const detalleError = obtenerDetallesValidacionCedula(datosCliente.cedula);
                mostrarErrorCampo('clientCedula', detalleError);
                hayErrores = true;
            }

            if (!datosCliente.nombre || datosCliente.nombre.trim().length < 2) {
                mostrarErrorCampo('clientName', 'El nombre debe tener al menos 2 caracteres');
                hayErrores = true;
            }

            if (!datosCliente.apellido || datosCliente.apellido.trim().length < 2) {
                mostrarErrorCampo('clientLastName', 'El apellido debe tener al menos 2 caracteres');
                hayErrores = true;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!datosCliente.email || !emailRegex.test(datosCliente.email)) {
                mostrarErrorCampo('clientEmail', 'Ingrese un email válido (ejemplo: usuario@correo.com)');
                hayErrores = true;
            }

            if (!datosCliente.telefono || datosCliente.telefono.trim().length < 7) {
                mostrarErrorCampo('clientPhone', 'El teléfono debe tener al menos 7 dígitos');
                hayErrores = true;
            }

            if (!datosCliente.direccion || datosCliente.direccion.trim().length < 5) {
                mostrarErrorCampo('clientAddress', 'La dirección debe tener al menos 5 caracteres');
                hayErrores = true;
            }

            if (hayErrores) {
                return false;
            }

            const clienteData = {
                cedula: parseInt(datosCliente.cedula),
                nombre: datosCliente.nombre.trim(),
                apellido: datosCliente.apellido.trim(),
                telefono: datosCliente.telefono.trim(),
                direccion: datosCliente.direccion.trim(),
                email: datosCliente.email.trim(),
                estado: 'Activo'
            };

            console.log('📤 Enviando datos del cliente:', clienteData);
            
            const response = await fetch('/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(clienteData)
            });

            console.log('📡 Respuesta del servidor:', response.status, response.statusText);

            if (response.ok) {
                const resultado = await response.json();
                console.log('✅ Cliente guardado exitosamente:', resultado);
                const provincia = obtenerNombreProvincia(datosCliente.cedula);
                mostrarEstadoCedula(`✅ Nuevo cliente registrado correctamente (${provincia})`, 'success');
                limpiarErroresCampos();
                return true;
            } else {
                const error = await response.json();
                console.error('❌ Error del servidor al guardar cliente:', error);
                
                if (error.error && error.error.includes('cédula')) {
                    mostrarErrorCampo('clientCedula', error.error);
                } else if (error.error && error.error.includes('email')) {
                    mostrarErrorCampo('clientEmail', error.error);
                } else {
                    mostrarEstadoCedula(`❌ Error: ${error.error || 'Error desconocido'}`, 'error');
                }
                return false;
            }
        } catch (error) {
            console.error('❌ Error de conexión al guardar cliente:', error);
            mostrarEstadoCedula('❌ Error de conexión al registrar cliente', 'error');
            return false;
        }
    }

    // ===== FUNCIONES PARA MOSTRAR ERRORES POR CAMPO =====
    
    function mostrarErrorCampo(campoId, mensaje) {
        const campo = document.getElementById(campoId);
        if (!campo) return;

        campo.style.borderColor = 'red';
        campo.style.borderWidth = '2px';

        let errorDiv = document.getElementById(`${campoId}-error`);
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = `${campoId}-error`;
            errorDiv.style.color = 'red';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.marginTop = '5px';
            errorDiv.style.fontWeight = 'bold';
            campo.parentNode.appendChild(errorDiv);
        }
        
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
    }

    function ocultarErrorCampo(campoId) {
        const campo = document.getElementById(campoId);
        if (campo) {
            campo.style.borderColor = '#ddd';
            campo.style.borderWidth = '1px';
        }

        const errorDiv = document.getElementById(`${campoId}-error`);
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
    }

    function limpiarErroresCampos() {
        const campos = ['clientCedula', 'clientName', 'clientLastName', 'clientPhone', 'clientEmail', 'clientAddress'];
        campos.forEach(campo => {
            ocultarErrorCampo(campo);
        });
    }

    // ===== EVENT LISTENERS ACTUALIZADOS PARA CÉDULA =====
    if (clientCedulaInput) {
        clientCedulaInput.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/[^0-9]/g, '');
            
            if (valor.length > 10) {
                valor = valor.substring(0, 10);
            }
            
            e.target.value = valor;
            ocultarErrorCampo('clientCedula');
            
            if (valor.length === 10) {
                // Validación en tiempo real con detalles
                if (validarCedula(valor)) {
                    const provincia = obtenerNombreProvincia(valor);
                    mostrarEstadoCedula(`✅ Cédula válida (${provincia}). Buscando cliente...`, 'loading');
                    buscarClientePorCedula(valor);
                } else {
                    const detalleError = obtenerDetallesValidacionCedula(valor);
                    mostrarErrorCedula(`❌ ${detalleError}`);
                    limpiarDatosCliente();
                }
            } else if (valor.length > 0) {
                limpiarDatosCliente();
                
                // Mostrar progreso de validación
                let mensaje = `Ingrese ${10 - valor.length} dígitos más`;
                if (valor.length >= 2) {
                    const codigoProvincia = parseInt(valor.substring(0, 2));
                    if (codigoProvincia >= 1 && codigoProvincia <= 24) {
                        const provincia = obtenerNombreProvincia(valor);
                        mensaje += ` (${provincia})`;
                    } else {
                        mensaje += ` (código provincia inválido: ${valor.substring(0, 2)})`;
                    }
                }
                mostrarEstadoCedula(mensaje, valor.length >= 2 && parseInt(valor.substring(0, 2)) > 24 ? 'error' : 'warning');
            } else {
                limpiarDatosCliente();
                mostrarEstadoCedula('', 'neutral');
            }
        });

        clientCedulaInput.addEventListener('blur', function(e) {
            const cedula = e.target.value.trim();
            if (cedula && cedula.length !== 10) {
                mostrarErrorCampo('clientCedula', 'La cédula debe tener exactamente 10 dígitos');
            } else if (cedula && cedula.length === 10) {
                if (validarCedula(cedula)) {
                    ocultarErrorCampo('clientCedula');
                    buscarClientePorCedula(cedula);
                } else {
                    const detalleError = obtenerDetallesValidacionCedula(cedula);
                    mostrarErrorCampo('clientCedula', detalleError);
                }
            }
        });

        clientCedulaInput.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }

    // ===== EVENT LISTENERS PARA TELÉFONO =====
    
    if (clientPhoneInput) {
        clientPhoneInput.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = valor;
            
            if (valor.length >= 7) {
                ocultarErrorCampo('clientPhone');
            }
        });

        clientPhoneInput.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key)) {
                e.preventDefault();
            }
        });

        clientPhoneInput.addEventListener('blur', function(e) {
            const valor = e.target.value.trim();
            if (valor.length < 7) {
                mostrarErrorCampo('clientPhone', 'El teléfono debe tener al menos 7 dígitos');
            } else {
                ocultarErrorCampo('clientPhone');
            }
        });
    }

    // ===== EVENT LISTENERS PARA VALIDACIÓN EN TIEMPO REAL =====
    
    if (clientNameInput) {
        clientNameInput.addEventListener('blur', function(e) {
            const valor = e.target.value.trim();
            if (valor.length < 2) {
                mostrarErrorCampo('clientName', 'El nombre debe tener al menos 2 caracteres');
            } else {
                ocultarErrorCampo('clientName');
            }
        });

        clientNameInput.addEventListener('input', function(e) {
            const valor = e.target.value.trim();
            if (valor.length >= 2) {
                ocultarErrorCampo('clientName');
            }
        });
    }

    if (clientLastNameInput) {
        clientLastNameInput.addEventListener('blur', function(e) {
            const valor = e.target.value.trim();
            if (valor.length < 2) {
                mostrarErrorCampo('clientLastName', 'El apellido debe tener al menos 2 caracteres');
            } else {
                ocultarErrorCampo('clientLastName');
            }
        });

        clientLastNameInput.addEventListener('input', function(e) {
            const valor = e.target.value.trim();
            if (valor.length >= 2) {
                ocultarErrorCampo('clientLastName');
            }
        });
    }

    if (clientEmailInput) {
        clientEmailInput.addEventListener('blur', function(e) {
            const valor = e.target.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (valor && !emailRegex.test(valor)) {
                mostrarErrorCampo('clientEmail', 'Ingrese un email válido (ejemplo: usuario@correo.com)');
            } else if (valor) {
                ocultarErrorCampo('clientEmail');
            }
        });

        clientEmailInput.addEventListener('input', function(e) {
            const valor = e.target.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (valor && emailRegex.test(valor)) {
                ocultarErrorCampo('clientEmail');
            }
        });
    }

    if (clientAddressInput) {
        clientAddressInput.addEventListener('blur', function(e) {
            const valor = e.target.value.trim();
            if (valor.length < 5) {
                mostrarErrorCampo('clientAddress', 'La dirección debe tener al menos 5 caracteres');
            } else {
                ocultarErrorCampo('clientAddress');
            }
        });

        clientAddressInput.addEventListener('input', function(e) {
            if (e.target.value.trim().length >= 5) {
                ocultarErrorCampo('clientAddress');
            }
        });
    }

    // ===== FUNCIONES PARA MANEJAR LIBROS E ISBN =====
    
    async function cargarLibrosDisponibles() {
        try {
            console.log('📚 Cargando libros disponibles...');
            const response = await fetch('/api/libros');
            if (response.ok) {
                librosDisponibles = await response.json();
                llenarSelectLibros();
                console.log(`✅ ${librosDisponibles.length} libros cargados`);
            } else {
                console.error('❌ Error al cargar libros:', response.status);
                mostrarMensajeError('Error al cargar libros desde el servidor');
            }
        } catch (error) {
            console.error('❌ Error al obtener libros:', error);
            mostrarMensajeError('Error de conexión al cargar libros');
        }
    }

    function llenarSelectLibros() {
        if (!libroSelect) return;
        
        libroSelect.innerHTML = '<option value="">Seleccionar libro...</option>';
        
        if (librosDisponibles.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No hay libros disponibles';
            option.disabled = true;
            libroSelect.appendChild(option);
            return;
        }

        librosDisponibles.forEach(libro => {
            const option = document.createElement('option');
            option.value = libro.isbn;
            option.textContent = `${libro.titulo}`;
            option.setAttribute('data-precio', libro.precio || 0);
            option.setAttribute('data-titulo', libro.titulo);
            option.setAttribute('data-isbn', libro.isbn);
            libroSelect.appendChild(option);
        });
    }

    async function buscarLibroPorISBN(isbn) {
        if (!isbn || isbn.length < 10) {
            limpiarDatosLibro();
            return;
        }

        console.log('🔍 Buscando libro con ISBN:', isbn);

        try {
            const libroEncontrado = librosDisponibles.find(libro => 
                libro.isbn.toString() === isbn.toString()
            );

            if (libroEncontrado) {
                console.log('✅ Libro encontrado en cache:', libroEncontrado.titulo);
                mostrarDatosLibro(libroEncontrado);
                if (libroSelect) libroSelect.value = isbn;
            } else {
                console.log('🌐 Buscando en API...');
                const response = await fetch(`/api/libros/${isbn}`);
                if (response.ok) {
                    const libro = await response.json();
                    console.log('✅ Libro encontrado en API:', libro.titulo);
                    mostrarDatosLibro(libro);
                    
                    if (!librosDisponibles.find(l => l.isbn.toString() === isbn.toString())) {
                        librosDisponibles.push(libro);
                        llenarSelectLibros();
                    }
                    if (libroSelect) libroSelect.value = isbn;
                } else if (response.status === 404) {
                    console.log('❌ ISBN no encontrado');
                    mostrarErrorISBN('ISBN no encontrado en la base de datos');
                    limpiarDatosLibro();
                } else {
                    throw new Error('Error del servidor');
                }
            }
        } catch (error) {
            console.error('❌ Error al buscar libro:', error);
            mostrarErrorISBN('Error al buscar el libro');
            limpiarDatosLibro();
        }
    }

    function mostrarDatosLibro(libro) {
        if (precioUnitarioInput) {
            precioUnitarioInput.value = libro.precio ? parseFloat(libro.precio).toFixed(2) : '0.00';
        }
        mostrarMensajeExito(`📚 Libro encontrado: ${libro.titulo}`);
        ocultarErrorISBN();
    }

    function limpiarDatosLibro() {
        if (precioUnitarioInput) precioUnitarioInput.value = '0.00';
        if (libroSelect) libroSelect.value = '';
    }

    function mostrarErrorISBN(mensaje) {
        if (!isbnInput) return;
        
        let errorDiv = document.getElementById('isbn-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'isbn-error';
            errorDiv.style.color = 'red';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.marginTop = '5px';
            isbnInput.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = mensaje;
        isbnInput.style.borderColor = 'red';
    }

    function ocultarErrorISBN() {
        const errorDiv = document.getElementById('isbn-error');
        if (errorDiv) {
            errorDiv.textContent = '';
        }
        if (isbnInput) {
            isbnInput.style.borderColor = '#ddd';
        }
    }

    function mostrarMensajeExito(mensaje) {
        if (!isbnInput) return;
        
        let successDiv = document.getElementById('isbn-success');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.id = 'isbn-success';
            successDiv.style.color = 'green';
            successDiv.style.fontSize = '12px';
            successDiv.style.marginTop = '5px';
            isbnInput.parentNode.appendChild(successDiv);
        }
        successDiv.textContent = mensaje;
        
        setTimeout(() => {
            if (successDiv) {
                successDiv.textContent = '';
            }
        }, 3000);
    }

    function mostrarMensajeError(mensaje) {
        console.error(mensaje);
        alert(mensaje);
    }

    // ===== EVENT LISTENERS PARA ISBN Y LIBRO =====
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    if (isbnInput) {
        isbnInput.addEventListener('input', debounce((e) => {
            const isbn = e.target.value.trim();
            if (isbn.length >= 10) {
                buscarLibroPorISBN(isbn);
            } else {
                limpiarDatosLibro();
                ocultarErrorISBN();
            }
        }, 500));
    }

    if (libroSelect) {
        libroSelect.addEventListener('change', (e) => {
            const isbn = e.target.value;
            if (isbn) {
                if (isbnInput) isbnInput.value = isbn;
                const libro = librosDisponibles.find(l => l.isbn.toString() === isbn.toString());
                if (libro) {
                    mostrarDatosLibro(libro);
                }
            } else {
                limpiarDatosLibro();
                if (isbnInput) isbnInput.value = '';
            }
        });
    }

    // ===== FUNCIONES DE FACTURA =====
    
    if (addItemBtn) {
        addItemBtn.addEventListener('click', function() {
            const idDetalle = `DET-${String(itemCounter).padStart(3, '0')}`;
            
            const isbn = isbnInput ? isbnInput.value.trim() : '';
            const cantidadInput = document.getElementById('cantidad');
            const cantidad = cantidadInput ? parseInt(cantidadInput.value) : 0;
            const precioUnitario = precioUnitarioInput ? parseFloat(precioUnitarioInput.value) : 0;

            if (!isbn || !cantidad || !precioUnitario) {
                alert('Por favor, complete todos los campos obligatorios.');
                return;
            }

            const libro = librosDisponibles.find(l => l.isbn.toString() === isbn.toString());
            const libroTitulo = libro ? libro.titulo : 'Libro no encontrado';

            if (!libro) {
                alert('El ISBN ingresado no corresponde a un libro válido en la base de datos.');
                return;
            }

            const totalItem = cantidad * precioUnitario;

            const item = {
                id: itemCounter,
                idDetalle: idDetalle,
                libro: libroTitulo,
                isbn: isbn,
                cantidad: cantidad,
                precioUnitario: precioUnitario,
                total: totalItem
            };

            invoiceItems.push(item);
            itemCounter++;
            updateInvoiceTable();
            limpiarFormularioItem();
            
            console.log('✅ Item agregado:', item);
        });
    }

    function limpiarFormularioItem() {
        if (libroSelect) libroSelect.value = '';
        if (isbnInput) isbnInput.value = '';
        
        const cantidadInput = document.getElementById('cantidad');
        if (cantidadInput) cantidadInput.value = '1';
        
        if (precioUnitarioInput) precioUnitarioInput.value = '0.00';
        
        ocultarErrorISBN();
        
        const proximoId = `DET-${String(itemCounter).padStart(3, '0')}`;
        const idDetalleInput = document.getElementById('idDetalle');
        if (idDetalleInput) {
            idDetalleInput.value = proximoId;
            idDetalleInput.style.backgroundColor = '#f8f9fa';
            idDetalleInput.style.color = '#6c757d';
        }
        
        const successDiv = document.getElementById('isbn-success');
        if (successDiv) {
            successDiv.textContent = '';
        }
    }

    function updateInvoiceTable() {
        if (!invoiceItemsTableBody) return;
        
        if (invoiceItems.length === 0) {
            invoiceItemsTableBody.innerHTML = '<tr><td colspan="7" class="no-items">No hay ítems en la factura.</td></tr>';
        } else {
            invoiceItemsTableBody.innerHTML = '';
            invoiceItems.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.idDetalle}</td>
                    <td>${item.libro}</td>
                    <td>${item.isbn}</td>
                    <td>${item.cantidad}</td>
                    <td>${item.precioUnitario.toFixed(2)}</td>
                    <td>${item.total.toFixed(2)}</td>
                    <td>
                        <button class="btn-delete" onclick="removeItem(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                invoiceItemsTableBody.appendChild(row);
            });
        }

        updateTotals();
    }

    window.removeItem = function(itemId) {
        invoiceItems = invoiceItems.filter(item => item.id !== itemId);
        updateInvoiceTable();
    };

    function updateTotals() {
        const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
        const iva = subtotal * 0.15;
        const total = subtotal + iva;

        const subtotalCell = document.getElementById('subtotalCell');
        const ivaCell = document.getElementById('ivaCell');
        const totalCell = document.getElementById('totalCell');

        if (subtotalCell) subtotalCell.textContent = `${subtotal.toFixed(2)}`;
        if (ivaCell) ivaCell.textContent = `${iva.toFixed(2)}`;
        if (totalCell) totalCell.innerHTML = `<strong>${total.toFixed(2)}</strong>`;
    }

    // ===== GENERAR FACTURA =====
    
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener('click', async function() {
            if (invoiceItems.length === 0) {
                alert('Debe añadir al menos un ítem a la factura.');
                return;
            }

            const clientCedula = clientCedulaInput ? clientCedulaInput.value.trim() : '';
            const clientName = clientNameInput ? clientNameInput.value.trim() : '';
            const clientLastName = clientLastNameInput ? clientLastNameInput.value.trim() : '';
            const clientPhone = clientPhoneInput ? clientPhoneInput.value.trim() : '';
            const clientEmail = clientEmailInput ? clientEmailInput.value.trim() : '';
            const clientAddress = clientAddressInput ? clientAddressInput.value.trim() : '';

            let hayErrores = false;

            limpiarErroresCampos();

            if (!clientCedula || !validarCedula(clientCedula)) {
                const detalleError = obtenerDetallesValidacionCedula(clientCedula);
                mostrarErrorCampo('clientCedula', detalleError);
                hayErrores = true;
            }

            if (!clientName || clientName.trim().length < 2) {
                mostrarErrorCampo('clientName', 'El nombre es obligatorio');
                hayErrores = true;
            }

            if (!clientLastName || clientLastName.trim().length < 2) {
                mostrarErrorCampo('clientLastName', 'El apellido es obligatorio');
                hayErrores = true;
            }

            if (!clientPhone || clientPhone.length < 7) {
                mostrarErrorCampo('clientPhone', 'El teléfono es obligatorio');
                hayErrores = true;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!clientEmail || !emailRegex.test(clientEmail)) {
                mostrarErrorCampo('clientEmail', 'Ingrese un email válido');
                hayErrores = true;
            }

            if (!clientAddress || clientAddress.trim().length < 5) {
                mostrarErrorCampo('clientAddress', 'La dirección es obligatoria');
                hayErrores = true;
            }

            if (hayErrores) {
                alert('❌ Por favor, corrija los errores marcados en rojo antes de continuar.');
                return;
            }

            if (!clienteEncontrado) {
                const nuevoCliente = {
                    cedula: clientCedula,
                    nombre: clientName,
                    apellido: clientLastName,
                    telefono: clientPhone,
                    email: clientEmail,
                    direccion: clientAddress,
                    estado: 'Activo'
                };

                const clienteGuardado = await guardarNuevoCliente(nuevoCliente);
                if (!clienteGuardado) {
                    alert('Error al registrar el nuevo cliente. Verifique los datos e intente nuevamente.');
                    return;
                }
            }

            const invoiceDateInput = document.getElementById('invoiceDate');
            const facturaData = {
                fecha_factura: invoiceDateInput ? invoiceDateInput.value : new Date().toISOString().split('T')[0],
                cliente_cedula: clientCedula,
                cliente_nombre: clientName,
                cliente_telefono: clientPhone,
                cliente_email: clientEmail,
                cliente_direccion: clientAddress,
                items: invoiceItems.map(item => ({
                    id_detalle: item.idDetalle,
                    isbn: item.isbn,
                    cantidad: item.cantidad,
                    precio_unitario: item.precioUnitario
                }))
            };

            try {
                generatePdfBtn.disabled = true;
                generatePdfBtn.textContent = 'GENERANDO FACTURA...';

                console.log('📄 Enviando factura al servidor:', facturaData);

                const response = await fetch('/api/facturas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(facturaData)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Factura generada exitosamente:', result);
                    
                    alert(`¡Factura ${result.factura.numero_factura} generada exitosamente!\n\nTotal: ${result.factura.total.toFixed(2)}\nÍtems: ${result.factura.items_count}`);
                    
                    limpiarFormularioCompleto();
                    await cargarFacturasGeneradas();
                    
                } else {
                    const error = await response.json();
                    console.error('❌ Error del servidor:', error);
                    alert(`Error al generar la factura: ${error.error}`);
                }

            } catch (error) {
                console.error('❌ Error al generar factura:', error);
                alert('Error de conexión al generar la factura. Por favor, intente nuevamente.');
            } finally {
                generatePdfBtn.disabled = false;
                generatePdfBtn.textContent = 'GENERAR FACTURA';
            }
        });
    }

    function limpiarFormularioCompleto() {
        if (clientCedulaInput) clientCedulaInput.value = '';
        if (clientNameInput) clientNameInput.value = '';
        if (clientLastNameInput) clientLastNameInput.value = '';
        if (clientPhoneInput) clientPhoneInput.value = '';
        if (clientEmailInput) clientEmailInput.value = '';
        if (clientAddressInput) clientAddressInput.value = '';
        
        clienteEncontrado = false;
        habilitarCamposCliente();
        mostrarEstadoCedula('', 'neutral');
        
        limpiarErroresCampos();
        
        invoiceItems = [];
        itemCounter = 1;
        updateInvoiceTable();
        limpiarFormularioItem();
        
        if (invoiceNumberInput) {
            invoiceNumberInput.value = 'Se generará automáticamente';
        }
        
        const invoiceDateInput = document.getElementById('invoiceDate');
        if (invoiceDateInput) {
            const hoy = new Date().toISOString().split('T')[0];
            invoiceDateInput.value = hoy;
        }
        
        console.log('🧹 Formulario limpiado completamente - Counter reset');
    }

    // ===== CARGAR Y MOSTRAR FACTURAS - TABLA PRINCIPAL =====
    
    async function cargarFacturasGeneradas() {
        try {
            console.log('📋 Cargando facturas desde la tabla principal...');
            console.log('🌐 URL de consulta:', '/api/facturas');
            
            const response = await fetch('/api/facturas');
            console.log('📡 Respuesta del servidor:', response.status, response.statusText);
            
            if (response.ok) {
                const facturas = await response.json();
                console.log('📄 Facturas recibidas:', facturas);
                
                facturasGeneradas = facturas;
                mostrarFacturasEnTabla(facturas);
                console.log(`✅ ${facturas.length} facturas cargadas`);
                
            } else if (response.status === 404) {
                console.log('⚠️ No se encontraron facturas');
                mostrarTablaVacia();
            } else {
                const errorText = await response.text();
                console.error('❌ Error al cargar facturas:', response.status, errorText);
                mostrarErrorEnTabla(`Error ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error al obtener facturas:', error);
            mostrarErrorEnTabla('Error de conexión al cargar facturas');
        }
    }

    function mostrarFacturasEnTabla(facturas) {
        if (!facturasTableBody) return;

        if (facturas.length === 0) {
            mostrarTablaVacia();
            return;
        }

        facturasTableBody.innerHTML = '';

        facturas.forEach(factura => {
            const row = document.createElement('tr');
            row.className = 'fade-in';
            
            const fecha = new Date(factura.fecha_factura).toLocaleDateString('es-ES');
            const fechaCreacion = new Date(factura.fecha_creacion).toLocaleDateString('es-ES');
            const estado = factura.estado || 'Activa';

            row.innerHTML = `
                <td><strong>${factura.numero_factura || 'N/A'}</strong></td>
                <td>
                    <div><strong>${factura.cliente_nombre || 'N/A'}</strong></div>
                    <small class="text-muted">Cédula: ${factura.cliente_cedula || 'N/A'}</small>
                </td>
                <td>
                    <div>${fecha}</div>
                    <small class="text-muted">Creada: ${fechaCreacion}</small>
                </td>
                <td class="text-center">
                    <span class="badge ${estado === 'Activa' ? 'badge-success' : 'badge-secondary'}">${estado}</span>
                </td>
                <td class="text-center">${factura.total_items || 0}</td>
                <td class="text-right">${parseFloat(factura.subtotal || 0).toFixed(2)}</td>
                <td class="text-right">${parseFloat(factura.iva || 0).toFixed(2)}</td>
                <td class="text-right">
                    <strong style="color: #28a745; font-size: 1.1em;">${parseFloat(factura.total || 0).toFixed(2)}</strong>
                </td>
                <td class="acciones-container">
                    <button class="btn-view" onclick="verDetallesFactura(${factura.id})" title="Ver detalles de la factura">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-print" onclick="imprimirFactura(${factura.id})" title="Imprimir factura">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                    <button class="btn-delete" onclick="eliminarFactura(${factura.id})" title="Eliminar factura permanentemente">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            `;
            
            facturasTableBody.appendChild(row);
        });
    }

    function mostrarTablaVacia() {
        if (!facturasTableBody) return;
        
        facturasTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center" style="padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; margin-bottom: 10px;"></i>
                    <div>No hay facturas para mostrar</div>
                    <small class="text-muted">Las facturas generadas aparecerán aquí</small>
                </td>
            </tr>
        `;
    }

    function mostrarErrorEnTabla(mensaje) {
        if (!facturasTableBody) return;
        
        facturasTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center" style="color: red; padding: 40px;">
                    <i class="fas fa-exclamation-triangle"></i> ${mensaje}
                </td>
            </tr>
        `;
    }

    // ===== FUNCIÓN PARA VER DETALLES DE UNA FACTURA =====
    window.verDetallesFactura = async function(facturaId) {
        console.log('👁️ Viendo detalles de factura ID:', facturaId);
        
        try {
            const detallesResponse = await fetch(`/api/facturas/${facturaId}/detalles`);
            
            if (detallesResponse.ok) {
                const detalles = await detallesResponse.json();
                console.log('📋 Detalles recibidos:', detalles);
                
                // Pasar el facturaId directamente
                mostrarModalDetallesSimple(detalles, facturaId);
            } else {
                alert('❌ No se pudieron cargar los detalles de la factura');
            }
        } catch (error) {
            console.error('❌ Error al cargar detalles:', error);
            alert('❌ Error de conexión al cargar los detalles');
        }
    };

    // ===== FUNCIÓN PARA IMPRIMIR FACTURA =====
    window.imprimirFactura = async function(facturaId, esDesdeModal = false) {
        console.log('🖨️ Generando PDF para la factura ID:', facturaId);
        
        let btnImprimir = null;
        let textoOriginal = '';
        
        try {
            // Solo buscar el botón si NO es desde modal y existe event
            if (!esDesdeModal && typeof event !== 'undefined' && event && event.target) {
                btnImprimir = event.target.closest('.btn-print');
                if (btnImprimir) {
                    textoOriginal = btnImprimir.innerHTML;
                    btnImprimir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
                    btnImprimir.disabled = true;
                }
            }

            console.log('📡 Obteniendo datos de la factura...');
            
            const [facturaResponse, detallesResponse] = await Promise.all([
                fetch(`/api/facturas/${facturaId}`),
                fetch(`/api/facturas/${facturaId}/detalles`)
            ]);

            if (!facturaResponse.ok || !detallesResponse.ok) {
                throw new Error('Error al obtener los datos de la factura');
            }

            const facturaData = await facturaResponse.json();
            const detallesData = await detallesResponse.json();

            console.log('✅ Datos de factura obtenidos:', facturaData);
            console.log('✅ Detalles obtenidos:', detallesData);

            // Generar PDF con verificación completa
            await generarPDFFacturaSeguro(facturaData, detallesData);

            // Restaurar botón solo si existe
            if (btnImprimir) {
                btnImprimir.innerHTML = textoOriginal;
                btnImprimir.disabled = false;
            }

            console.log('✅ PDF generado exitosamente');

        } catch (error) {
            console.error('❌ Error al generar PDF:', error);
            alert('❌ Error al generar el PDF de la factura. Por favor, intente nuevamente.');
            
            // Restaurar botón solo si existe
            if (btnImprimir) {
                btnImprimir.innerHTML = textoOriginal || '<i class="fas fa-print"></i> Imprimir';
                btnImprimir.disabled = false;
            }
        }
    };

    // ===== FUNCIÓN PARA GENERAR PDF - COMPLETAMENTE SEGURA =====
    async function generarPDFFacturaSeguro(factura, detalles) {
        console.log('📄 Iniciando generación de PDF con verificaciones de seguridad...');
        
        // Verificación 1: jsPDF está disponible
        if (typeof window.jspdf === 'undefined') {
            console.error('❌ jsPDF no está cargado');
            throw new Error('La librería jsPDF no está disponible. Por favor, recargue la página.');
        }

        // Verificación 2: Extraer jsPDF correctamente
        let jsPDF;
        try {
            jsPDF = window.jspdf.jsPDF;
            if (!jsPDF) {
                // Intentar otra forma de acceso
                jsPDF = window.jspdf;
            }
            if (typeof jsPDF !== 'function') {
                throw new Error('jsPDF no es una función válida');
            }
        } catch (error) {
            console.error('❌ Error al acceder a jsPDF:', error);
            throw new Error('Error al acceder a la librería jsPDF');
        }

        // Verificación 3: Datos válidos
        if (!factura) {
            throw new Error('Datos de factura no válidos');
        }

        if (!detalles || !Array.isArray(detalles)) {
            console.warn('⚠️ Detalles no válidos, usando array vacío');
            detalles = [];
        }

        // Crear documento PDF
        let doc;
        try {
            doc = new jsPDF();
            console.log('✅ Documento PDF creado correctamente');
        } catch (error) {
            console.error('❌ Error al crear documento PDF:', error);
            throw new Error('Error al inicializar el documento PDF');
        }

        try {
            // === ENCABEZADO ===
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text("FACTURA ELECTRONICA", 105, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text("Sistema de Gestion de Libreria", 105, 28, { align: 'center' });
            
            // Línea separadora
            doc.setLineWidth(0.5);
            doc.line(15, 35, 195, 35);

            let yPos = 45;
            
            // === INFORMACIÓN DE FACTURA ===
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("INFORMACION DE FACTURA", 15, yPos);
            
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            
            // Datos de factura (lado izquierdo)
            const numeroFactura = factura.numero_factura || 'N/A';
            const fechaFactura = factura.fecha_factura ? 
                new Date(factura.fecha_factura).toLocaleDateString('es-ES') : 
                new Date().toLocaleDateString('es-ES');
            const estadoFactura = factura.estado || 'Activa';
            
            doc.text(`Numero de Factura: ${numeroFactura}`, 15, yPos);
            doc.text(`Fecha: ${fechaFactura}`, 15, yPos + 6);
            doc.text(`Estado: ${estadoFactura}`, 15, yPos + 12);
            
            // Datos del cliente (lado derecho)
            doc.setFont("helvetica", "bold");
            doc.text("DATOS DEL CLIENTE", 110, yPos);
            doc.setFont("helvetica", "normal");
            
            const clienteCedula = factura.cliente_cedula || 'N/A';
            const clienteNombre = factura.cliente_nombre || 'N/A';
            const clienteTelefono = factura.cliente_telefono || 'N/A';
            const clienteEmail = factura.cliente_email || 'N/A';
            const clienteDireccion = factura.cliente_direccion || 'N/A';
            
            doc.text(`Cedula: ${clienteCedula}`, 110, yPos + 6);
            doc.text(`Nombre: ${clienteNombre}`, 110, yPos + 12);
            doc.text(`Telefono: ${clienteTelefono}`, 110, yPos + 18);
            doc.text(`Email: ${clienteEmail}`, 110, yPos + 24);
            
            yPos += 30;
            if (clienteDireccion && clienteDireccion !== 'N/A') {
                doc.text(`Direccion: ${clienteDireccion}`, 15, yPos);
                yPos += 6;
            }
            
            yPos += 15;
            
            // === DETALLE DE PRODUCTOS ===
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("DETALLE DE PRODUCTOS", 15, yPos);
            
            yPos += 10;
            
            // Encabezados de tabla
            const headers = ['ITEM', 'LIBRO', 'ISBN', 'CANT.', 'PRECIO UNIT.', 'TOTAL'];
            const colWidths = [15, 60, 30, 20, 25, 25];
            let xPos = 15;
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            
            // Fondo del encabezado
            doc.setFillColor(18, 140, 126);
            doc.rect(15, yPos - 5, 175, 8, 'F');
            
            // Texto del encabezado en blanco
            doc.setTextColor(255, 255, 255);
            for (let i = 0; i < headers.length; i++) {
                doc.text(headers[i], xPos + 2, yPos, { maxWidth: colWidths[i] - 4 });
                xPos += colWidths[i];
            }
            
            // Restaurar color de texto
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
            
            yPos += 8;
            
            // === FILAS DE DATOS ===
            let subtotalCalculado = 0;
            
            if (detalles && detalles.length > 0) {
                detalles.forEach((detalle, index) => {
                    xPos = 15;
                    
                    // Fondo alternado
                    if (index % 2 === 0) {
                        doc.setFillColor(248, 249, 250);
                        doc.rect(15, yPos - 4, 175, 6, 'F');
                    }
                    
                    // Datos de la fila
                    const idDetalle = detalle.id_detalle || `DET-${String(index + 1).padStart(3, '0')}`;
                    const libroTitulo = detalle.libro_titulo || 'Titulo no disponible';
                    const isbnLibro = detalle.isbn_libro || 'N/A';
                    const cantidad = detalle.cantidad || 0;
                    const precioUnitario = parseFloat(detalle.precio_unitario || 0);
                    const totalItem = parseFloat(detalle.total_item || (cantidad * precioUnitario));
                    
                    subtotalCalculado += totalItem;
                    
                    const rowData = [
                        idDetalle,
                        libroTitulo.length > 25 ? libroTitulo.substring(0, 22) + '...' : libroTitulo,
                        isbnLibro,
                        cantidad.toString(),
                        precioUnitario.toFixed(2),
                        totalItem.toFixed(2)
                    ];
                    
                    // Imprimir cada celda
                    for (let i = 0; i < rowData.length; i++) {
                        doc.text(rowData[i], xPos + 2, yPos, { maxWidth: colWidths[i] - 4 });
                        xPos += colWidths[i];
                    }
                    
                    yPos += 6;
                    
                    // Nueva página si es necesario
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            } else {
                doc.setFont("helvetica", "italic");
                doc.text("No hay detalles disponibles para esta factura", 15, yPos);
                yPos += 6;
            }
            
            yPos += 15;
            
            // === TOTALES ===
            const subtotal = subtotalCalculado || parseFloat(factura.subtotal || 0);
            const iva = subtotal * 0.15;
            const total = subtotal + iva;
            
            const totalXPos = 120;
            
            doc.setFont("helvetica", "normal");
            doc.text("Subtotal:", totalXPos, yPos);
            doc.text(`${subtotal.toFixed(2)}`, totalXPos + 40, yPos);
            
            yPos += 6;
            doc.text("IVA (15%):", totalXPos, yPos);
            doc.text(`${iva.toFixed(2)}`, totalXPos + 40, yPos);
            
            yPos += 8;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("TOTAL:", totalXPos, yPos);
            doc.text(`${total.toFixed(2)}`, totalXPos + 40, yPos);
            
            yPos += 20;
            
            // === PIE DE PÁGINA ===
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text("Gracias por su compra", 105, yPos, { align: 'center' });
            doc.text(`Factura generada el ${new Date().toLocaleString('es-ES')}`, 105, yPos + 6, { align: 'center' });
            
            // === GUARDAR PDF ===
            const nombreArchivo = `Factura_${numeroFactura.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
            
            try {
                doc.save(nombreArchivo);
                console.log('✅ PDF guardado exitosamente:', nombreArchivo);
                
                // Mostrar mensaje de éxito después de un momento
                setTimeout(() => {
                    alert(`✅ PDF generado exitosamente\n\nArchivo: ${nombreArchivo}\n\nEl archivo se ha descargado automaticamente.`);
                }, 500);
                
            } catch (saveError) {
                console.error('❌ Error al guardar PDF:', saveError);
                throw new Error('Error al guardar el archivo PDF');
            }
            
        } catch (error) {
            console.error('❌ Error durante la creación del PDF:', error);
            throw new Error(`Error al crear el contenido del PDF: ${error.message}`);
        }
    }

    // ===== FUNCIÓN PARA MOSTRAR MODAL - CON MANEJO MEJORADO =====
    function mostrarModalDetallesSimple(detalles, facturaId) {
        if (!detalles || detalles.length === 0) {
            alert('ℹ️ Esta factura no tiene detalles disponibles');
            return;
        }

        // Cerrar modal existente si hay uno
        const modalExistente = document.getElementById('modalDetalles');
        if (modalExistente) {
            modalExistente.remove();
        }

        let contenidoModal = `
        <div style="
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.5); 
            z-index: 9999; 
            display: flex; 
            align-items: center; 
            justify-content: center;
        " onclick="cerrarModal(event)">
            <div style="
                background: white; 
                padding: 20px; 
                border-radius: 10px; 
                max-width: 800px; 
                max-height: 80vh; 
                overflow-y: auto; 
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                position: relative;
            " onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                    <h3 style="color: #333; margin: 0;">📋 Detalles de Factura: ${detalles[0].numero_factura || 'N/A'}</h3>
                    <button onclick="cerrarModal()" style="
                        background: #dc3545; 
                        color: white; 
                        border: none; 
                        padding: 8px 12px; 
                        border-radius: 5px; 
                        cursor: pointer; 
                        font-size: 16px;
                    ">✕</button>
                </div>
                
                <div style="margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 5px;">
                    <strong>Cliente:</strong> ${detalles[0].cliente_nombre || 'N/A'}<br>
                    <strong>Fecha:</strong> ${detalles[0].fecha_factura ? new Date(detalles[0].fecha_factura).toLocaleDateString('es-ES') : 'N/A'}
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #007bff; color: white;">
                            <th style="padding: 10px; border: 1px solid #ddd;">ID Detalle</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Libro</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">ISBN</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Cantidad</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Precio Unit.</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Total</th>
                        </tr>
                    </thead>
                    <tbody>`;

        let totalGeneral = 0;
        detalles.forEach((detalle, index) => {
            const totalItem = parseFloat(detalle.total_item || 0);
            totalGeneral += totalItem;
            
            contenidoModal += `
                <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                        <span style="background: #17a2b8; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
                            ${detalle.id_detalle || `DET-${index + 1}`}
                        </span>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        <strong>${detalle.libro_titulo || 'Título no disponible'}</strong>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                        <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px;">
                            ${detalle.isbn_libro || 'N/A'}
                        </code>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                        <strong>${detalle.cantidad || 0}</strong>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                        ${parseFloat(detalle.precio_unitario || 0).toFixed(2)}
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                        <strong style="color: #28a745;">${totalItem.toFixed(2)}</strong>
                    </td>
                </tr>`;
        });

        const subtotal = totalGeneral;
        const iva = subtotal * 0.15;
        const total = subtotal + iva;

        contenidoModal += `
                    </tbody>
                </table>
                
                <div style="background: #e9ecef; padding: 15px; border-radius: 5px; text-align: right;">
                    <div style="margin-bottom: 5px;">
                        <strong>Subtotal: ${subtotal.toFixed(2)}</strong>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>IVA (15%): ${iva.toFixed(2)}</strong>
                    </div>
                    <div style="font-size: 1.2em; color: #28a745; border-top: 2px solid #28a745; padding-top: 10px;">
                        <strong>TOTAL: ${total.toFixed(2)}</strong>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="cerrarModal()" style="
                        background: #6c757d; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 5px; 
                        cursor: pointer; 
                        margin-right: 10px;
                    ">Cerrar</button>
                    <button class="btn-print" onclick="imprimirFacturaDirecta(${facturaId})" style="
                        background: #007bff; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 5px; 
                        cursor: pointer;
                    ">🖨️ Imprimir Factura</button>
                </div>
            </div>
        </div>`;

        // Insertar el modal en el DOM
        const modalDiv = document.createElement('div');
        modalDiv.id = 'modalDetalles';
        modalDiv.innerHTML = contenidoModal;
        document.body.appendChild(modalDiv);
    }

    // ===== FUNCIÓN DIRECTA PARA IMPRIMIR - COPIA EXACTA DE LA TABLA =====
    window.imprimirFacturaDirecta = function(facturaId) {
        console.log('🖨️ Imprimiendo factura directa - ID:', facturaId);
        
        // Simular el event.target para que funcione igual que en la tabla
        const botonTemporal = {
            closest: () => ({
                innerHTML: '<i class="fas fa-print"></i> Imprimir',
                disabled: false
            })
        };
        
        // Crear un event temporal
        window.event = {
            target: botonTemporal
        };
        
        // Llamar exactamente a la misma función que usa la tabla
        imprimirFactura(facturaId, false);
    };

    // ===== FUNCIÓN PARA CERRAR MODAL - CORREGIDA =====
    window.cerrarModal = function(event) {
        console.log('🚪 Intentando cerrar modal...');
        
        // Si hay un event y no es el target correcto, no cerrar
        if (event && event.target !== event.currentTarget && event.type === 'click') {
            console.log('❌ Click no es en el fondo del modal, no cerrar');
            return;
        }
        
        const modal = document.getElementById('modalDetalles');
        if (modal) {
            console.log('✅ Cerrando modal...');
            
            // Remover todos los event listeners antes de eliminar
            const botones = modal.querySelectorAll('button');
            botones.forEach(boton => {
                boton.onclick = null;
                boton.removeEventListener('click', boton.onclick);
            });
            
            // Eliminar el modal del DOM
            modal.remove();
            console.log('✅ Modal cerrado correctamente');
            
            // Asegurar que no queden modales duplicados
            const modalesRestantes = document.querySelectorAll('[id="modalDetalles"]');
            modalesRestantes.forEach(modalRestante => {
                modalRestante.remove();
            });
            
        } else {
            console.log('⚠️ No se encontró modal para cerrar');
        }
    };

    // ===== FUNCIÓN ELIMINAR FACTURAS =====
    
    window.eliminarFactura = async function(facturaId) {
        console.log('🗑️ Iniciando eliminación de factura ID:', facturaId);
        
        const confirmar1 = confirm('⚠️ ¿ELIMINAR FACTURA PERMANENTEMENTE?\n\n⚠️ ADVERTENCIA: Esta acción NO se puede deshacer.\n\n✅ Se eliminarán:\n• La factura completa\n• Todos sus detalles\n• Todo el historial\n\n¿Continuar?');
        if (!confirmar1) {
            console.log('❌ Eliminación cancelada en primera confirmación');
            return;
        }

        const confirmar2 = confirm('🔴 CONFIRMACIÓN FINAL\n\nEsta es la ÚLTIMA oportunidad para cancelar.\n\n💀 LA FACTURA SE ELIMINARÁ PARA SIEMPRE\n\n¿Está COMPLETAMENTE SEGURO?');
        if (!confirmar2) {
            console.log('❌ Eliminación cancelada en segunda confirmación');
            return;
        }

        const motivo = prompt('📝 Por favor, ingrese el motivo de eliminación:\n\n(Este registro se guardará para auditoría)', 'Eliminación autorizada por administrador');
        if (!motivo || motivo.trim() === '') {
            alert('❌ Debe ingresar un motivo válido para eliminar la factura');
            return;
        }

        try {
            console.log('🗑️ Enviando solicitud de eliminación...');
            
            const response = await fetch(`/api/facturas/${facturaId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    motivo: motivo.trim(),
                    usuario: 'Administrador',
                    timestamp: new Date().toISOString()
                })
            });

            console.log('📡 Respuesta del servidor:', response.status, response.statusText);

            if (response.ok) {
                const resultado = await response.json();
                console.log('✅ Factura eliminada:', resultado);
                
                alert(`✅ FACTURA ELIMINADA EXITOSAMENTE\n\n📄 Factura: ${resultado.numero_factura}\n👤 Cliente: ${resultado.cliente}\n📝 Motivo: ${motivo}\n\n🔄 Actualizando lista...`);
                
                await cargarFacturasGeneradas();
                
                console.log('🔄 Lista de facturas actualizada después de eliminación');
                
            } else {
                const error = await response.json();
                console.error('❌ Error del servidor:', error);
                alert(`❌ ERROR AL ELIMINAR FACTURA\n\n${error.error}\n\nPor favor, contacte al administrador del sistema.`);
            }

        } catch (error) {
            console.error('❌ Error de conexión al eliminar:', error);
            alert('❌ ERROR DE CONEXIÓN\n\nNo se pudo conectar con el servidor.\nVerifique su conexión e intente nuevamente.');
        }
    };

    // ===== BOTONES DE CONTROL =====
    
    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', async function() {
            console.log('🔄 Refrescando lista de facturas...');
            await cargarFacturasGeneradas();
        });
    }

    const btnLimpiarAntiguas = document.getElementById('btnLimpiarAntiguas');
    if (btnLimpiarAntiguas) {
        btnLimpiarAntiguas.addEventListener('click', async function() {
            const confirmar = confirm('⚠️ ¿LIMPIAR FACTURAS ANULADAS ANTIGUAS?\n\nEsto eliminará permanentemente:\n• Facturas anuladas de más de 30 días\n• Facturas de prueba\n\n¿Continuar?');
            if (!confirmar) return;

            try {
                btnLimpiarAntiguas.disabled = true;
                btnLimpiarAntiguas.textContent = 'Limpiando...';
                
                alert('Funcionalidad en desarrollo.\nPor ahora, use el botón eliminar individual en cada factura.');

            } catch (error) {
                console.error('Error al limpiar facturas:', error);
                alert('Error al limpiar facturas antiguas');
            } finally {
                btnLimpiarAntiguas.disabled = false;
                btnLimpiarAntiguas.innerHTML = '<i class="fas fa-broom"></i> Limpiar Facturas Antiguas';
            }
        });
    }

    // ===== FUNCIONES UTILITARIAS =====
    
    function formatearMoneda(numero) {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD'
        }).format(numero);
    }

    function validarEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validarTelefono(telefono) {
        const re = /^[\d\-\+\(\)\s]+$/;
        return re.test(telefono) && telefono.length >= 7;
    }

    function formatearFecha(fecha) {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    // Auto-refrescar facturas cada 30 segundos
    setInterval(async () => {
        console.log('🔄 Auto-refrescando facturas...');
        await cargarFacturasGeneradas();
    }, 30000);

    // ===== FUNCIÓN DE PRUEBA PARA VALIDACIÓN DE CÉDULA =====
    window.probarValidacionCedula = function() {
        console.log("🧪 === PRUEBA DE VALIDACIÓN DE CÉDULA ECUATORIANA ===");
        
        const cedulasPrueba = [
            // CÉDULAS VÁLIDAS
            { cedula: "1714616123", descripcion: "✅ Válida - Pichincha" },
            { cedula: "0926687856", descripcion: "✅ Válida - Guayas" },
            { cedula: "1803909892", descripcion: "✅ Válida - Tungurahua" },
            { cedula: "0150632827", descripcion: "✅ Válida - Azuay" },
            
            // CÉDULAS INVÁLIDAS
            { cedula: "1714616124", descripcion: "❌ Dígito verificador incorrecto" },
            { cedula: "2514616123", descripcion: "❌ Provincia inexistente (25)" },
            { cedula: "1764616123", descripcion: "❌ Tercer dígito inválido (6)" },
            { cedula: "171461612", descripcion: "❌ Solo 9 dígitos" },
            { cedula: "17146161234", descripcion: "❌ 11 dígitos" },
            { cedula: "171461612a", descripcion: "❌ Contiene letras" },
            { cedula: "", descripcion: "❌ Cédula vacía" },
            { cedula: "0014616123", descripcion: "❌ Provincia 00 inválida" }
        ];
        
        console.log("📊 Resultados de las pruebas:");
        
        cedulasPrueba.forEach((test, index) => {
            const esValida = validarCedulaEcuatoriana(test.cedula);
            const detalles = obtenerDetallesValidacionCedula(test.cedula);
            const provincia = esValida ? obtenerNombreProvincia(test.cedula) : "N/A";
            
            console.log(`${index + 1}. ${test.cedula} - ${test.descripcion}`);
            console.log(`   Resultado: ${esValida ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
            console.log(`   Detalle: ${detalles}`);
            if (esValida) {
                console.log(`   Provincia: ${provincia}`);
            }
            console.log('   ---');
        });
        
        // Estadísticas
        const validas = cedulasPrueba.filter(test => validarCedulaEcuatoriana(test.cedula));
        const invalidas = cedulasPrueba.filter(test => !validarCedulaEcuatoriana(test.cedula));
        
        console.log(`📈 RESUMEN:`);
        console.log(`   Total probadas: ${cedulasPrueba.length}`);
        console.log(`   ✅ Válidas: ${validas.length}`);
        console.log(`   ❌ Inválidas: ${invalidas.length}`);
        console.log(`   🎯 Precisión: ${((validas.length + invalidas.length) / cedulasPrueba.length * 100).toFixed(1)}%`);
    };

    // ===== INICIALIZACIÓN FINAL =====
    
    inicializar();
    
    console.log('🎉 Sistema de facturas completamente inicializado');
    console.log('💡 Para probar la validación de cédula, ejecuta: probarValidacionCedula()');

});

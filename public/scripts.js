// scripts.js - Dashboard JavaScript con funcionalidad PDF

// Variables globales
let currentCategory = 'ficcion';
let dashboardData = {};
let currentLowRotationPage = 1;
let totalLowRotationPages = 1;

// Datos para PDFs (se cargarán con las consultas)
let weeklyData = null;
let lowRotationData = null;
let categoryBooksData = null;
let bestSellersData = null;

// Inicialización del dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadChartJS().then(() => {
        initializeDashboard();
        setupEventListeners();
    });
});

// Función principal de inicialización
async function initializeDashboard() {
    try {
        showLoading(true);
        
        // Cargar todos los datos del dashboard - CAMBIO: 5 elementos por página
        await Promise.all([
            loadDashboardStats(),
            loadWeeklySales(),
            loadLowRotationBooks(1, 5), // CAMBIO: De 10 a 5
            loadLowRotationStats(),
            loadLowRotationFilters(),
            loadCategoriesAndBooks(),
            loadBestSellers(),
            loadRecentActivity()
        ]);
        
        showMessage('Dashboard cargado correctamente', 'success');
    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
        showMessage('Error al cargar el dashboard', 'error');
    } finally {
        showLoading(false);
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Hamburger menu
    const toggleButton = document.getElementById('toggleSidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Marcar página activa en navegación
    markActiveNavItem();
}

// ===== FUNCIONES PDF =====

// Función para mostrar el modal de descarga
function showDownloadModal(fileName) {
    const modal = document.getElementById('downloadModal');
    const fileNameElement = document.getElementById('fileName');
    
    if (modal && fileNameElement) {
        fileNameElement.textContent = fileName;
        modal.style.display = 'flex';
        
        // Auto cerrar después de 3 segundos
        setTimeout(() => {
            closeDownloadModal();
        }, 3000);
    }
}

// Función para cerrar el modal de descarga
function closeDownloadModal() {
    const modal = document.getElementById('downloadModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Función para generar PDF de ventas semanales
async function generateWeeklySalesPDF() {
    try {
        if (!weeklyData) {
            showMessage('No hay datos de ventas disponibles', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configuración inicial
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let yPosition = margin;
        
        // Header del documento
        doc.setFontSize(20);
        doc.setTextColor(142, 36, 170); // Color púrpura
        doc.text('LIBRERIA DEL GRUPO-2', pageWidth/2, yPosition, { align: 'center' });
        
        yPosition += 15;
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Reporte de Ventas Semanales', pageWidth/2, yPosition, { align: 'center' });
        
        yPosition += 10;
        doc.setFontSize(10);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, pageWidth/2, yPosition, { align: 'center' });
        
        yPosition += 20;
        
        // Resumen de estadísticas
        doc.setFontSize(14);
        doc.setTextColor(142, 36, 170);
        doc.text('RESUMEN EJECUTIVO', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        const summary = weeklyData.summary;
        doc.text(`• Ventas de esta semana: $${summary.current_week.toLocaleString()}`, margin, yPosition);
        yPosition += 7;
        doc.text(`• Ventas semana anterior: $${summary.previous_week.toLocaleString()}`, margin, yPosition);
        yPosition += 7;
        doc.text(`• Crecimiento: ${summary.growth_percentage >= 0 ? '+' : ''}${summary.growth_percentage}%`, margin, yPosition);
        yPosition += 7;
        doc.text(`• Promedio semanal: $${summary.average_weekly_sales}`, margin, yPosition);
        yPosition += 20;
        
        // Datos semanales detallados
        doc.setFontSize(14);
        doc.setTextColor(142, 36, 170);
        doc.text('DATOS SEMANALES DETALLADOS', margin, yPosition);
        yPosition += 15;
        
        // Tabla de datos
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        // Headers de tabla
        doc.text('Semana', margin, yPosition);
        doc.text('Año', margin + 40, yPosition);
        doc.text('Ventas', margin + 70, yPosition);
        doc.text('Facturas', margin + 120, yPosition);
        yPosition += 10;
        
        // Línea separadora
        doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
        
        // Datos de la tabla
        weeklyData.chart_data.forEach(week => {
            doc.text(week.semana.toString(), margin, yPosition);
            doc.text(week.anio.toString(), margin + 40, yPosition);
            doc.text(`$${week.ventas.toLocaleString()}`, margin + 70, yPosition);
            doc.text(week.facturas.toString(), margin + 120, yPosition);
            yPosition += 7;
            
            if (yPosition > 270) {
                doc.addPage();
                yPosition = margin;
            }
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 285, { align: 'right' });
            doc.text('Sistema de Gestion - Libreria Grupo-2', margin, 285);
        }
        
        // Guardar el PDF
        const fileName = `ventas_semanales_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showDownloadModal(fileName);
        showMessage('Reporte de ventas semanales generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al generar PDF de ventas:', error);
        showMessage('Error al generar el reporte PDF', 'error');
    }
}

// Función para generar PDF de libros de baja rotación
async function generateLowRotationPDF() {
    try {
        // Cargar todos los datos de baja rotación (sin paginación)
        const response = await fetch('/api/reports/low-rotation-books?page=1&limit=1000');
        if (!response.ok) throw new Error('Error al cargar datos');
        
        const allData = await response.json();
        
        if (!allData.data || allData.data.length === 0) {
            showMessage('No hay datos de libros de baja rotación disponibles', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let yPosition = margin;
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(142, 36, 170);
        doc.text('LIBRERÍA DEL GRUPO-2', pageWidth/2, yPosition, { align: 'center' });
        
        yPosition += 15;
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Reporte de Libros de Baja Rotación', pageWidth/2, yPosition, { align: 'center' });
        
        yPosition += 10;
        doc.setFontSize(10);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, pageWidth/2, yPosition, { align: 'center' });
        doc.text('Libros con menos de 3 ventas en los ultimos 30 dias', pageWidth/2, yPosition + 5, { align: 'center' });
        
        yPosition += 25;
        
        // Estadísticas generales
        doc.setFontSize(14);
        doc.setTextColor(142, 36, 170);
        doc.text('RESUMEN ESTADÍSTICO', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`• Total de libros de baja rotación: ${allData.pagination.total_records}`, margin, yPosition);
        yPosition += 7;
        doc.text(`• Libros sin ventas: ${allData.data.filter(book => book.ventas_30_dias === 0).length}`, margin, yPosition);
        yPosition += 7;
        doc.text(`• Libros con 1-2 ventas: ${allData.data.filter(book => book.ventas_30_dias > 0 && book.ventas_30_dias < 3).length}`, margin, yPosition);
        yPosition += 20;
        
        // Lista detallada de libros
        doc.setFontSize(14);
        doc.setTextColor(142, 36, 170);
        doc.text('LISTADO DETALLADO', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        
        allData.data.forEach((book, index) => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = margin;
            }
            
            doc.text(`${index + 1}. ${book.titulo}`, margin, yPosition);
            yPosition += 5;
            doc.text(`   Autor: ${book.autor}`, margin + 5, yPosition);
            yPosition += 5;
            doc.text(`   Categoría: ${book.categoria} | Precio: $${book.precio.toFixed(2)} | Ventas: ${book.ventas_30_dias}`, margin + 5, yPosition);
            yPosition += 10;
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 285, { align: 'right' });
            doc.text('Sistema de Gestión - Librería Grupo-2', margin, 285);
        }
        
        const fileName = `libros_baja_rotacion_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showDownloadModal(fileName);
        showMessage('Reporte de libros de baja rotación generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al generar PDF de baja rotación:', error);
        showMessage('Error al generar el reporte PDF', 'error');
    }
}

// Función para generar PDF de libros más vendidos por categoría
async function generateCategoryBooksPDF() {
    try {
        if (!categoryBooksData) {
            showMessage('No hay datos de libros por categoría disponibles', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let yPosition = margin;
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(142, 36, 170);
        doc.text('LIBRERÍA DEL GRUPO-2', pageWidth/2, yPosition, { align: 'center' });
        
        yPosition += 15;
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Libros Más Vendidos por Categoría', pageWidth/2, yPosition, { align: 'center' });
        
        yPosition += 10;
        doc.setFontSize(10);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, pageWidth/2, yPosition, { align: 'center' });
        
        yPosition += 25;
        
        // Procesar cada categoría
        Object.entries(categoryBooksData).forEach(([category, books]) => {
            if (books.length === 0) return;
            
            if (yPosition > 250) {
                doc.addPage();
                yPosition = margin;
            }
            
            // Título de categoría
            doc.setFontSize(14);
            doc.setTextColor(142, 36, 170);
            doc.text(category.toUpperCase(), margin, yPosition);
            yPosition += 15;
            
            // Libros de la categoría
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            books.slice(0, 5).forEach((book, index) => {
                doc.text(`${index + 1}. ${book.titulo}`, margin + 5, yPosition);
                yPosition += 5;
                doc.text(`   Autor: ${book.autor} | Ventas: ${book.ventas}`, margin + 10, yPosition);
                yPosition += 8;
            });
            
            yPosition += 10;
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 285, { align: 'right' });
            doc.text('Sistema de Gestión - Librería Grupo-2', margin, 285);
        }
        
        const fileName = `libros_por_categoria_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showDownloadModal(fileName);
        showMessage('Reporte de libros por categoría generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al generar PDF por categoría:', error);
        showMessage('Error al generar el reporte PDF', 'error');
    }
}

// Función para generar PDF de best sellers
async function generateBestSellersPDF() {
    try {
        if (!bestSellersData || bestSellersData.length === 0) {
            showMessage('No hay datos de best sellers disponibles', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let yPosition = margin;
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(142, 36, 170);
        doc.text('LIBRERÍA DEL GRUPO-2', pageWidth/2, yPosition, { align: 'center' });
        
        yPosition += 15;
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Top 5 Best Sellers Más Vendidos', pageWidth/2, yPosition, { align: 'center' });
        
        yPosition += 10;
        doc.setFontSize(10);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, pageWidth/2, yPosition, { align: 'center' });
        doc.text('Los libros mas vendidos de todos los tiempos', pageWidth/2, yPosition + 5, { align: 'center' });
        
        yPosition += 25;
        
        // Estadísticas generales
        doc.setFontSize(14);
        doc.setTextColor(142, 36, 170);
        doc.text('RANKING DE BEST SELLERS', margin, yPosition);
        yPosition += 15;
        
        // Lista de best sellers
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        bestSellersData.slice(0, 5).forEach((book, index) => {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = margin;
            }
            
            // Número de ranking
            doc.setFontSize(14);
            doc.setTextColor(142, 36, 170);
            doc.text(`#${index + 1}`, margin, yPosition);
            
            // Información del libro
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`${book.titulo}`, margin + 20, yPosition);
            yPosition += 8;
            
            doc.setFontSize(10);
            doc.text(`Autor: ${book.autor}`, margin + 20, yPosition);
            yPosition += 6;
            doc.text(`Categoría: ${book.categoria}`, margin + 20, yPosition);
            yPosition += 6;
            doc.text(`Total de ventas: ${book.ventas_totales} unidades`, margin + 20, yPosition);
            yPosition += 6;
            doc.text(`Precio promedio: ${book.precio_promedio}`, margin + 20, yPosition);
            yPosition += 6;
            doc.text(`Es Best Seller oficial: ${book.es_bestseller}`, margin + 20, yPosition);
            
            yPosition += 15;
            
            // Línea separadora
            if (index < bestSellersData.length - 1) {
                doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
                yPosition += 5;
            }
        });
        
        // Estadísticas adicionales
        yPosition += 15;
        doc.setFontSize(14);
        doc.setTextColor(142, 36, 170);
        doc.text('ESTADÍSTICAS ADICIONALES', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        const totalVentas = bestSellersData.reduce((sum, book) => sum + book.ventas_totales, 0);
        const promedioVentas = totalVentas / bestSellersData.length;
        
        doc.text(`Total de ventas del Top 5: ${totalVentas.toLocaleString()} unidades`, margin, yPosition);
        yPosition += 7;
        doc.text(`Promedio de ventas: ${Math.round(promedioVentas).toLocaleString()} unidades por libro`, margin, yPosition);
        yPosition += 7;
        doc.text(`Libro mas vendido: ${bestSellersData[0].titulo} (${bestSellersData[0].ventas_totales} ventas)`, margin, yPosition);
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 285, { align: 'right' });
            doc.text('Sistema de Gestión - Librería Grupo-2', margin, 285);
        }
        
        const fileName = `best_sellers_top5_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showDownloadModal(fileName);
        showMessage('Reporte de best sellers generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al generar PDF de best sellers:', error);
        showMessage('Error al generar el reporte PDF', 'error');
    }
}

// ===== FIN FUNCIONES PDF =====

// Función para mostrar/ocultar loading
function showLoading(show) {
    let spinner = document.getElementById('loadingSpinner');
    
    if (show && !spinner) {
        // Crear spinner si no existe
        spinner = document.createElement('div');
        spinner.id = 'loadingSpinner';
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner"></div>
            <p>Cargando datos...</p>
        `;
        document.body.appendChild(spinner);
    }
    
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Función para cargar estadísticas del dashboard
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const statsConfig = [
            { 
                title: 'Total Clientes', 
                value: data.total_clientes || 0, 
                link: 'Ashley/cliente.html',
                linkText: 'Gestionar Clientes'
            },
            { 
                title: 'Libros Registrados', 
                value: data.total_libros || 0, 
                link: 'Jair/libros.html',
                linkText: 'Gestionar Libros'
            },
            { 
                title: 'Facturas Emitidas', 
                value: data.total_facturas || 0, 
                link: 'Leonardo/factura.html',
                linkText: 'Gestionar Facturas'
            },
            { 
                title: 'Nuevos Autores', 
                value: data.total_autores || 0, 
                link: 'Jair/autor.html',
                linkText: 'Gestionar Autores'
            },
            { 
                title: 'Editoriales Registradas', 
                value: data.total_editoriales || 0, 
                link: 'Maria/editorial.html',
                linkText: 'Gestionar Editoriales'
            }
        ];
        
        renderStatsGrid(statsConfig);
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        showErrorInStats();
    }
}

// Función para renderizar la grilla de estadísticas
function renderStatsGrid(statsConfig) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    
    statsGrid.innerHTML = '';
    
    statsConfig.forEach(stat => {
        const statBox = document.createElement('div');
        statBox.className = 'stat-box';
        statBox.innerHTML = `
            <h3>${stat.title}</h3>
            <p class="stat-number" data-value="${stat.value}">0</p>
            <a href="${stat.link}">${stat.linkText}</a>
        `;
        statsGrid.appendChild(statBox);
        
        // Animar el número
        animateNumber(statBox.querySelector('.stat-number'), stat.value);
    });
}

// Función para animar números
function animateNumber(element, targetValue) {
    let currentValue = 0;
    const increment = targetValue / 50;
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        element.textContent = Math.floor(currentValue);
    }, 20);
}

// Función para cargar ventas semanales con gráfico
async function loadWeeklySales() {
    try {
        const response = await fetch('/api/reports/weekly-sales');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Guardar datos para PDF
        weeklyData = data;
        
        renderWeeklySalesWithChart(data);
        
    } catch (error) {
        console.error('Error al cargar ventas semanales:', error);
        showErrorInWeeklySales();
    }
}

// Función para renderizar ventas semanales con gráfico real
function renderWeeklySalesWithChart(data) {
    const chartContainer = document.getElementById('weeklyChart');
    const statsContainer = document.getElementById('weeklyStats');
    
    if (!chartContainer || !statsContainer) return;
    
    // Crear canvas para el gráfico
    chartContainer.innerHTML = `
        <canvas id="weeklySalesChart" width="400" height="200" style="width: 100%; height: 200px;"></canvas>
    `;
    
    // Renderizar estadísticas
    const summary = data.summary;
    const growth = summary.growth_percentage;
    const growthColor = growth >= 0 ? '#4caf50' : '#f44336';
    const growthSymbol = growth >= 0 ? '+' : '';
    
    statsContainer.innerHTML = `
        <div>
            <strong>Esta semana:</strong><br>
            <span style="color: #8E24AA; font-size: 1.2em;">${summary.current_week.toLocaleString()}</span>
        </div>
        <div>
            <strong>Semana anterior:</strong><br>
            <span style="color: #666;">${summary.previous_week.toLocaleString()}</span>
        </div>
        <div>
            <strong>Crecimiento:</strong><br>
            <span style="color: ${growthColor};">${growthSymbol}${growth}%</span>
        </div>
        <div>
            <strong>Promedio semanal:</strong><br>
            <span style="color: #333;">${summary.average_weekly_sales}</span>
        </div>
    `;
    
    // Crear gráfico con Chart.js (si está disponible) o Canvas nativo
    setTimeout(() => {
        createWeeklySalesChart(data.chart_data);
    }, 100);
}

// Función para crear gráfico de ventas semanales
function createWeeklySalesChart(chartData) {
    const canvas = document.getElementById('weeklySalesChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Si Chart.js está disponible, usar Chart.js
    if (typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(item => item.label),
                datasets: [{
                    label: 'Ventas Semanales',
                    data: chartData.map(item => item.ventas),
                    borderColor: '#8E24AA',
                    backgroundColor: 'rgba(142, 36, 170, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#8E24AA',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return  + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });
    } else {
        // Fallback: Gráfico simple con Canvas nativo
        drawSimpleChart(ctx, chartData);
    }
}

// Función fallback para dibujar gráfico simple
function drawSimpleChart(ctx, data) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);
    
    if (data.length === 0) return;
    
    // Calcular valores máximos y mínimos
    const maxValue = Math.max(...data.map(item => item.ventas));
    const minValue = Math.min(...data.map(item => item.ventas));
    const valueRange = maxValue - minValue || 1;
    
    // Configurar estilos
    ctx.strokeStyle = '#8E24AA';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(142, 36, 170, 0.1)';
    
    // Dibujar ejes
    ctx.beginPath();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // Eje Y
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    
    // Eje X
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Dibujar línea de datos
    ctx.beginPath();
    ctx.strokeStyle = '#8E24AA';
    ctx.lineWidth = 3;
    
    data.forEach((item, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth;
        const y = height - padding - ((item.ventas - minValue) / valueRange) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Dibujar puntos
    ctx.fillStyle = '#8E24AA';
    data.forEach((item, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth;
        const y = height - padding - ((item.ventas - minValue) / valueRange) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // Agregar etiquetas de valores
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // Etiquetas del eje Y (valores)
    for (let i = 0; i <= 4; i++) {
        const value = minValue + (valueRange * i / 4);
        const y = height - padding - (i / 4) * chartHeight;
        ctx.fillText( + Math.round(value).toLocaleString(), padding - 15, y + 4);
    }
    
    // Etiquetas del eje X (semanas)
    data.forEach((item, index) => {
        if (index % Math.ceil(data.length / 4) === 0) {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const label = `S${item.semana}`;
            ctx.save();
            ctx.translate(x, height - padding + 20);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }
    });
}

// Función para cargar libros de baja rotación con paginación - CAMBIO: limit por defecto 5
async function loadLowRotationBooks(page = 1, limit = 5) {
    try {
        const response = await fetch(`/api/reports/low-rotation-books?page=${page}&limit=${limit}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Guardar datos para PDF
        lowRotationData = data;
        
        renderLowRotationBooks(data);
        
    } catch (error) {
        console.error('Error al cargar libros de baja rotación:', error);
        showErrorInLowRotation();
    }
}

// Función para renderizar libros de baja rotación con paginación
function renderLowRotationBooks(data) {
    const container = document.getElementById('lowRotationBooks');
    if (!container) return;
    
    // Actualizar variables globales de paginación
    currentLowRotationPage = data.pagination.current_page;
    totalLowRotationPages = data.pagination.total_pages;
    
    if (!data.data || data.data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No hay libros de baja rotación</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Renderizar libros
    data.data.forEach(book => {
        html += `
            <div class="book-item">
                <div>
                    <div class="book-title">${book.titulo}</div>
                    <div class="book-author">${book.autor}</div>
                    <div class="book-category" style="color: #999; font-size: 0.8em;">${book.categoria}</div>
                </div>
                <div style="text-align: right;">
                    <div class="book-sales">${book.ventas_30_dias} venta${book.ventas_30_dias !== 1 ? 's' : ''}</div>
                    <div style="color: #666; font-size: 0.8em;">${book.precio.toFixed(2)}</div>
                </div>
            </div>
        `;
    });
    
    // Agregar controles de paginación - CAMBIO: limit = 5
    html += `
        <div class="pagination-controls" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
            <div class="pagination-info" style="text-align: center; margin-bottom: 15px; color: #666; font-size: 0.9em;">
                Página ${data.pagination.current_page} de ${data.pagination.total_pages} 
                (${data.pagination.total_records} libros total - Mostrando 5 por página)
            </div>
            <div class="pagination-buttons" style="display: flex; justify-content: center; gap: 10px;">
                <button 
                    class="pagination-btn" 
                    onclick="loadLowRotationBooks(${data.pagination.previous_page}, 5)" 
                    ${!data.pagination.has_previous ? 'disabled' : ''}
                    style="padding: 8px 12px; border: 1px solid #ddd; background: ${!data.pagination.has_previous ? '#f5f5f5' : '#fff'}; border-radius: 4px; cursor: ${!data.pagination.has_previous ? 'not-allowed' : 'pointer'};"
                >
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
                
                <span style="display: flex; align-items: center; padding: 0 15px; color: #666;">
                    ${data.pagination.current_page} / ${data.pagination.total_pages}
                </span>
                
                <button 
                    class="pagination-btn" 
                    onclick="loadLowRotationBooks(${data.pagination.next_page}, 5)" 
                    ${!data.pagination.has_next ? 'disabled' : ''}
                    style="padding: 8px 12px; border: 1px solid #ddd; background: ${!data.pagination.has_next ? '#f5f5f5' : '#fff'}; border-radius: 4px; cursor: ${!data.pagination.has_next ? 'not-allowed' : 'pointer'};"
                >
                    Siguiente <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Función para cargar categorías y libros más vendidos por categoría
async function loadCategoriesAndBooks() {
    try {
        const response = await fetch('/api/reports/books-by-category');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Guardar datos para PDF
        categoryBooksData = data.books || {};
        
        renderCategoryTabs(data.categories || []);
        dashboardData.categoryBooks = data.books || {};
        
        // Mostrar la primera categoría por defecto
        if (data.categories && data.categories.length > 0) {
            showCategory(data.categories[0].toLowerCase());
        }
        
    } catch (error) {
        console.error('Error al cargar libros por categoría:', error);
        showErrorInCategories();
    }
}

// Función para renderizar pestañas de categorías
function renderCategoryTabs(categories) {
    const tabsContainer = document.getElementById('categoryTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    categories.forEach((category, index) => {
        const tab = document.createElement('div');
        tab.className = `category-tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = category;
        tab.onclick = () => showCategory(category.toLowerCase());
        tabsContainer.appendChild(tab);
    });
}

// Función para mostrar libros de una categoría específica - CAMBIO: solo mostrar 5
function showCategory(category) {
    // Actualizar pestañas activas
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase() === category) {
            tab.classList.add('active');
        }
    });
    
    // Mostrar libros de la categoría
    const container = document.getElementById('categoryBooks');
    if (!container) return;
    
    const books = dashboardData.categoryBooks[category] || [];
    
    if (books.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <p>No hay libros en esta categoría</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    // CAMBIO: Solo mostrar los primeros 5 libros
    const booksToShow = books.slice(0, 5);
    
    booksToShow.forEach(book => {
        const bookItem = document.createElement('div');
        bookItem.className = 'book-item';
        bookItem.innerHTML = `
            <div>
                <div class="book-title">${book.titulo}</div>
                <div class="book-author">${book.autor}</div>
            </div>
            <div class="book-sales">${book.ventas} venta${book.ventas !== 1 ? 's' : ''}</div>
        `;
        container.appendChild(bookItem);
    });
    
    // CAMBIO: Agregar nota si hay más libros
    if (books.length > 5) {
        const moreInfo = document.createElement('div');
        moreInfo.style.cssText = `
            text-align: center; 
            padding: 10px; 
            color: #666; 
            font-style: italic; 
            border-top: 1px solid #eee; 
            margin-top: 10px;
        `;
        moreInfo.innerHTML = `
            <i class="fas fa-info-circle"></i> 
            Mostrando 5 de ${books.length} libros en esta categoría
        `;
        container.appendChild(moreInfo);
    }
    
    currentCategory = category;
}

// Función para cargar best sellers - CAMBIO: añadir parámetro limit
async function loadBestSellers() {
    try {
        // CAMBIO: Agregar parámetro limit=5 al endpoint
        const response = await fetch('/api/reports/best-sellers?limit=5');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const books = await response.json();
        
        // Guardar datos para PDF
        bestSellersData = books;
        
        renderBestSellers(books);
        
    } catch (error) {
        console.error('Error al cargar best sellers:', error);
        showErrorInBestSellers();
    }
}

// Función para renderizar best sellers
function renderBestSellers(books) {
    const container = document.getElementById('bestSellers');
    if (!container) return;
    
    if (!books || books.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <p>No hay best sellers registrados</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    // CAMBIO: Asegurar que solo se muestren máximo 5 libros
    const booksToShow = books.slice(0, 5);
    
    booksToShow.forEach((book, index) => {
        const bookItem = document.createElement('div');
        bookItem.className = 'book-item';
        bookItem.innerHTML = `
            <div>
                <div class="book-title">
                    <span style="color: #8E24AA; font-weight: bold; margin-right: 8px;">#${index + 1}</span>
                    ${book.titulo}
                </div>
                <div class="book-author">${book.autor}</div>
            </div>
            <div class="book-sales">${book.ventas_totales} venta${book.ventas_totales !== 1 ? 's' : ''}</div>
        `;
        container.appendChild(bookItem);
    });
    
    // CAMBIO: Agregar nota informativa
    if (books.length >= 5) {
        const infoNote = document.createElement('div');
        infoNote.style.cssText = `
            text-align: center; 
            padding: 10px; 
            color: #666; 
            font-style: italic; 
            border-top: 1px solid #eee; 
            margin-top: 10px;
        `;
        infoNote.innerHTML = `
            <i class="fas fa-trophy"></i> 
            Top 5 libros más vendidos
        `;
        container.appendChild(infoNote);
    }
}

// Función para cargar actividad reciente
async function loadRecentActivity() {
    try {
        const response = await fetch('/api/reports/recent-activity');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const activities = await response.json();
        
        renderRecentActivity(activities);
        
    } catch (error) {
        console.error('Error al cargar actividad reciente:', error);
        showErrorInRecentActivity();
    }
}

// Función para renderizar actividad reciente
function renderRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <li class="empty-state">No hay actividad reciente registrada</li>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    activities.forEach(activity => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            ${activity.descripcion} <strong>(${formatDate(activity.fecha)})</strong>
        `;
        container.appendChild(listItem);
    });
}

// Función para cargar filtros de categorías para libros de baja rotación
async function loadLowRotationFilters() {
    try {
        const response = await fetch('/api/libros');
        if (!response.ok) return;
        
        const libros = await response.json();
        const categorias = [...new Set(libros.map(libro => libro.categoria).filter(cat => cat))];
        
        renderLowRotationFilters(categorias);
        
    } catch (error) {
        console.error('Error al cargar filtros:', error);
    }
}

// Función para renderizar filtros de baja rotación
function renderLowRotationFilters(categorias) {
    const container = document.getElementById('lowRotationBooks');
    if (!container) return;
    
    // Crear contenedor de filtros si no existe
    let filtersContainer = document.getElementById('lowRotationFilters');
    if (!filtersContainer) {
        filtersContainer = document.createElement('div');
        filtersContainer.id = 'lowRotationFilters';
        filtersContainer.style.cssText = `
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        `;
        container.parentNode.insertBefore(filtersContainer, container);
    }
    
    filtersContainer.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
            <div>
                <label style="font-weight: bold; margin-right: 8px;">Categoría:</label>
                <select id="categoryFilter" style="padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="all">Todas las categorías</option>
                    ${categorias.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
            </div>
            <div>
                <label style="font-weight: bold; margin-right: 8px;">Precio mín:</label>
                <input type="number" id="minPriceFilter" placeholder="0" style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <label style="font-weight: bold; margin-right: 8px;">Precio máx:</label>
                <input type="number" id="maxPriceFilter" placeholder="999" style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <button onclick="applyLowRotationFilters()" style="padding: 8px 16px; background: #8E24AA; color: white; border: none; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-filter"></i> Filtrar
            </button>
            <button onclick="clearLowRotationFilters()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-times"></i> Limpiar
            </button>
        </div>
    `;
}

// Función para aplicar filtros - CAMBIO: limit = 5
async function applyLowRotationFilters() {
    const categoria = document.getElementById('categoryFilter')?.value || 'all';
    const minPrecio = document.getElementById('minPriceFilter')?.value || '';
    const maxPrecio = document.getElementById('maxPriceFilter')?.value || '';
    
    // CAMBIO: limit = 5
    let url = '/api/reports/low-rotation-books/filters?page=1&limit=5';
    
    if (categoria !== 'all') url += `&categoria=${encodeURIComponent(categoria)}`;
    if (minPrecio) url += `&min_precio=${minPrecio}`;
    if (maxPrecio) url += `&max_precio=${maxPrecio}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        renderLowRotationBooks(data);
        
        showMessage(`Filtros aplicados: ${data.pagination.total_records} libros encontrados`, 'info');
        
    } catch (error) {
        console.error('Error al aplicar filtros:', error);
        showMessage('Error al aplicar filtros', 'error');
    }
}

// Función para limpiar filtros - CAMBIO: limit = 5
function clearLowRotationFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const minPriceFilter = document.getElementById('minPriceFilter');
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    
    if (categoryFilter) categoryFilter.value = 'all';
    if (minPriceFilter) minPriceFilter.value = '';
    if (maxPriceFilter) maxPriceFilter.value = '';
    
    loadLowRotationBooks(1, 5); // CAMBIO: limit = 5
}

// Función para cargar estadísticas de libros de baja rotación
async function loadLowRotationStats() {
    try {
        const response = await fetch('/api/reports/low-rotation-books/stats');
        if (!response.ok) return;
        
        const stats = await response.json();
        displayLowRotationStats(stats);
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Función para mostrar estadísticas de baja rotación
function displayLowRotationStats(stats) {
    const container = document.querySelector('.report-card h3')?.parentNode;
    if (!container) return;
    
    let statsContainer = document.getElementById('lowRotationStats');
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'lowRotationStats';
        statsContainer.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 15px;
            font-size: 0.9em;
        `;
        const paragraph = container.querySelector('p');
        if (paragraph) {
            paragraph.after(statsContainer);
        }
    }
    
    statsContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; text-align: center;">
            <div>
                <strong style="color: #856404;">${stats.total_libros_baja_rotacion}</strong><br>
                <span style="color: #856404;">Total libros</span>
            </div>
            <div>
                <strong style="color: #856404;">${stats.distribucion.sin_ventas}</strong><br>
                <span style="color: #856404;">Sin ventas</span>
            </div>
            <div>
                <strong style="color: #856404;">${stats.promedio_ventas}</strong><br>
                <span style="color: #856404;">Prom. ventas</span>
            </div>
            <div>
                <strong style="color: #856404;">${stats.porcentaje_inventario}%</strong><br>
                <span style="color: #856404;">Del inventario</span>
            </div>
        </div>
    `;
}

// Función para refrescar el dashboard
async function refreshDashboard() {
    const refreshButton = document.querySelector('.refresh-button');
    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    }
    
    try {
        await initializeDashboard();
        
        // Animar estadísticas
        document.querySelectorAll('.stat-number').forEach(stat => {
            stat.style.transform = 'scale(1.1)';
            setTimeout(() => {
                stat.style.transform = 'scale(1)';
            }, 200);
        });
        
    } catch (error) {
        console.error('Error al refrescar dashboard:', error);
        showMessage('Error al actualizar el dashboard', 'error');
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
        }
    }
}

// Función para mostrar mensajes
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    // Auto-remover después de unos segundos
    const duration = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, duration);
}

// Funciones para mostrar errores específicos
function showErrorInStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle"></i>
                Error al cargar estadísticas
            </div>
        `;
    }
}

function showErrorInWeeklySales() {
    const chartPlaceholder = document.getElementById('weeklyChart');
    if (chartPlaceholder) {
        chartPlaceholder.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                Error al cargar datos de ventas
            </div>
        `;
    }
}

function showErrorInLowRotation() {
    const container = document.getElementById('lowRotationBooks');
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                Error al cargar libros de baja rotación
            </div>
        `;
    }
}

function showErrorInCategories() {
    const tabsContainer = document.getElementById('categoryTabs');
    const booksContainer = document.getElementById('categoryBooks');
    
    if (tabsContainer) {
        tabsContainer.innerHTML = `
            <div class="error-state">Error al cargar categorías</div>
        `;
    }
    
    if (booksContainer) {
        booksContainer.innerHTML = `
            <div class="error-state">Error al cargar libros por categoría</div>
        `;
    }
}

function showErrorInBestSellers() {
    const container = document.getElementById('bestSellers');
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                Error al cargar best sellers
            </div>
        `;
    }
}

function showErrorInRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (container) {
        container.innerHTML = `
            <li class="error-state">Error al cargar actividad reciente</li>
        `;
    }
}

// Función para marcar elemento de navegación activo
function markActiveNavItem() {
    const navItems = document.querySelectorAll('.sidebar-nav-main .nav-item, .sidebar-bottom-links .nav-item');
    const currentPath = window.location.pathname.split('/').pop();
    
    navItems.forEach(item => {
        item.classList.remove('active');
        
        const href = item.getAttribute('href');
        if (href === currentPath || 
            (href === 'index.html' && (currentPath === '' || currentPath === 'index.html'))) {
            item.classList.add('active');
        }
    });
}

// Función para formatear fechas
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Función para incluir Chart.js dinámicamente si no está disponible
function loadChartJS() {
    return new Promise((resolve, reject) => {
        if (typeof Chart !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/chart.js/3.9.1/chart.min.js';
        script.onload = () => resolve();
        script.onerror = () => {
            console.warn('No se pudo cargar Chart.js, usando gráfico simple');
            resolve(); // Continuar sin Chart.js
        };
        document.head.appendChild(script);
    });
}

// Hacer funciones disponibles globalmente para onclick en HTML
window.refreshDashboard = refreshDashboard;
window.showCategory = showCategory;
window.loadLowRotationBooks = loadLowRotationBooks;
window.applyLowRotationFilters = applyLowRotationFilters;
window.clearLowRotationFilters = clearLowRotationFilters;

// Funciones PDF disponibles globalmente
window.generateWeeklySalesPDF = generateWeeklySalesPDF;
window.generateLowRotationPDF = generateLowRotationPDF;
window.generateCategoryBooksPDF = generateCategoryBooksPDF;
window.generateBestSellersPDF = generateBestSellersPDF;
window.closeDownloadModal = closeDownloadModal;

// Exportar funciones para uso global
window.dashboardAPI = {
    refreshDashboard,
    showCategory,
    showMessage,
    loadDashboardStats,
    loadWeeklySales,
    loadLowRotationBooks,
    loadBestSellers,
    loadRecentActivity,
    loadLowRotationStats,
    applyLowRotationFilters,
    clearLowRotationFilters,
    // Funciones PDF
    generateWeeklySalesPDF,
    generateLowRotationPDF,
    generateCategoryBooksPDF,
    generateBestSellersPDF
};
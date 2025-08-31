// Variables globales
let submit, loadingModal, submitText;
let ticketsData = []; // Almacenar los datos de los tickets para ordenación
let sortColumn = 'id'; // Columna de ordenación por defecto
let sortDirection = 'asc'; // Dirección de ordenación por defecto

// Función para configurar navegación por pestañas
function setupNavigation() {
    const tabMapping = {
        'nav-vender': 'vender',
        'nav-estadisticas': 'estadisticas',
        'nav-scanner': 'scanner'
    };

    // Agregar elementos de navegación al navbar si no existen
    const navbar = document.querySelector('.navbar-nav');
    
    if (navbar && !document.querySelector('#nav-vender')) {
        // Crear elementos de navegación
        const navItems = [
            { id: 'vender', icon: 'bi-tag-fill', text: 'Vender Boletos' },
            { id: 'estadisticas', icon: 'bi-bar-chart-fill', text: 'Estadísticas' },
            { id: 'scanner', icon: 'bi-qrcode', text: 'Escáner QR' }
        ];
        
        navItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'nav-item';
            
            const link = document.createElement('a');
            link.className = index === 0 ? 'nav-link active' : 'nav-link';
            link.id = 'nav-' + item.id;
            link.href = '#' + item.id;
            link.innerHTML = `<i class="bi ${item.icon} me-md-2"></i> <span>${item.text}</span>`;
            
            li.appendChild(link);
            navbar.appendChild(li);
            
            // Añadir event listener
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showPanel(item.id);
            });
        });
    } else {
        // Si ya existen, solo añadir los event listeners
        for (const navId in tabMapping) {
            const element = document.getElementById(navId);
            if (element) {
                element.addEventListener('click', function(e) {
                    e.preventDefault();
                    showPanel(tabMapping[navId]);
                });
            }
        }
    }
}

// Función para mostrar panel seleccionado
function showPanel(panelId) {
    // Actualizar enlaces activos en la navegación
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const navLink = document.querySelector(`#nav-${panelId}`);
    if (navLink) {
        navLink.classList.add('active');
    }
    
    // Ocultar todos los paneles
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
    });
    
    // Mostrar el panel seleccionado
    const targetPane = document.getElementById(panelId);
    if (targetPane) {
        targetPane.classList.add('show', 'active');
    }
    
    // Cargar datos según el panel
    if (panelId === 'estadisticas') {
        fetchTicketStats(true);
        fetchRecentTickets();
    } else if (panelId === 'scanner') {
        fetchRecentScans();
    }
}

// Fetch ticket statistics
function fetchTicketStats(updateDashboard = false) {
    fetch("/ticket-stats")
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                // Actualizar stats en el formulario de venta
                const totalTickets = document.getElementById("total-tickets");
                const usedTickets = document.getElementById("used-tickets");
                const vipTickets = document.getElementById("vip-tickets");
                
                // Verificar si los elementos existen antes de actualizar
                if (totalTickets) totalTickets.textContent = data.total || "0";
                if (usedTickets) usedTickets.textContent = data.used || "0";
                if (vipTickets) vipTickets.textContent = data.vip || "0";
                
                // Actualizar stats en el dashboard si se requiere
                if (updateDashboard) {
                    const totalDash = document.getElementById("total-tickets-dash");
                    const usedDash = document.getElementById("used-tickets-dash");
                    const vipDash = document.getElementById("vip-tickets-dash");
                    
                    // Verificar si los elementos existen antes de actualizar
                    if (totalDash) totalDash.textContent = data.total || "0";
                    if (usedDash) usedDash.textContent = data.used || "0";
                    if (vipDash) vipDash.textContent = data.vip || "0";
                }
            }
        })
        .catch(error => {
            console.error("Error fetching stats:", error);
            showNotification("Error", "No se pudieron cargar las estadísticas", "danger");
        });
}

// Fetch recent tickets con ordenación de columnas
function fetchRecentTickets() {
    fetch("/recent-tickets")
        .then(response => response.json())
        .then(data => {
            if (data.status === "success" && data.tickets) {
                // Almacenar los datos para ordenación
                ticketsData = data.tickets;
                
                // Renderizar la tabla ordenada
                renderTicketsTable();
                
                // Configurar la ordenación por columnas
                setupColumnSorting();
            } else {
                const tableBody = document.getElementById("tickets-table");
                if (tableBody) {
                    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-3">No hay datos disponibles</td></tr>`;
                }
            }
        })
        .catch(error => {
            console.error("Error fetching recent tickets:", error);
            const tableBody = document.getElementById("tickets-table");
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-3">Error al cargar datos</td></tr>`;
            }
        });
}

// Función para renderizar la tabla de tickets con ordenación
function renderTicketsTable(searchTerm = '') {
    const tableBody = document.getElementById("tickets-table");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (ticketsData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-3">No hay boletos registrados</td></tr>`;
        return;
    }
    
    // Ordenar los datos según la columna seleccionada
    const sortedData = [...ticketsData].sort((a, b) => {
        return compareValues(a, b, sortColumn, sortDirection);
    });
    
    // Filtrar los datos si hay término de búsqueda
    const filteredData = searchTerm ? 
        sortedData.filter(ticket => {
            const id = (ticket.id || ticket.boleto || '').toString().toLowerCase();
            const email = (ticket.email || '').toLowerCase();
            return id.includes(searchTerm) || email.includes(searchTerm);
        }) : sortedData;
    
    // Actualizar los encabezados de columna para mostrar la dirección de ordenación
    updateColumnHeaders();
    
    // Renderizar los datos
    filteredData.forEach(ticket => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${ticket.boleto || '-'}</td>
            <td>${ticket.id || '-'}</td>
            <td>${ticket.email || '-'}</td>
            <td>${ticket.vip ? '<span class="badge bg-warning text-dark">VIP</span>' : '<span class="badge bg-secondary">Normal</span>'}</td>
            <td>${ticket.usado ? '<span class="badge bg-danger">Usado</span>' : '<span class="badge bg-success">Disponible</span>'}</td>
            <td class="d-none d-md-table-cell">${ticket.fecha_creacion || ticket.fecha || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-details" data-ticket='${JSON.stringify(ticket)}'>
                    <i class="bi bi-eye"></i> <span class="d-none d-md-inline">Ver</span>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
        
        // Agregar event listener para ver detalles
        row.querySelector('.view-details').addEventListener('click', function() {
            const ticketData = JSON.parse(this.getAttribute('data-ticket'));
            showTicketDetails(ticketData);
        });
    });
    
    // Mostrar mensaje si no hay resultados de búsqueda
    if (searchTerm && filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-3">No se encontraron resultados para "${searchTerm}"</td></tr>`;
    }
}

// Configurar ordenación por columnas
function setupColumnSorting() {
    const tableHeaders = document.querySelectorAll('table thead th');
    if (!tableHeaders.length) return;
    
    // Agregar clase CSS para indicar que los encabezados son clickeables
    tableHeaders.forEach((header, index) => {
        if (index < 6) { // Ignorar la columna de acciones
            header.classList.add('sortable');
            
            // Determinar el campo de ordenación según el índice
            const sortFields = ['boleto', 'id', 'email', 'vip', 'usado', 'fecha_creacion'];
            const field = sortFields[index];
            
            header.addEventListener('click', () => {
                // Cambiar dirección si es la misma columna, o establecer ascendente si es una nueva columna
                if (sortColumn === field) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = field;
                    sortDirection = 'asc';
                }
                
                // Re-renderizar la tabla
                renderTicketsTable(document.getElementById('search-tickets')?.value?.toLowerCase().trim());
            });
        }
    });
}

// Actualizar los encabezados de columna para mostrar la dirección de ordenación
function updateColumnHeaders() {
    const tableHeaders = document.querySelectorAll('table thead th');
    if (!tableHeaders.length) return;
    
    const sortFields = ['boleto', 'id', 'email', 'vip', 'usado', 'fecha_creacion'];
    
    tableHeaders.forEach((header, index) => {
        if (index < 6) {
            // Limpiar cualquier indicador de ordenación anterior
            header.innerHTML = header.textContent.replace(/\s*[▲▼]$/, '');
            
            if (sortFields[index] === sortColumn) {
                // Añadir indicador de dirección
                const indicator = sortDirection === 'asc' ? ' ▲' : ' ▼';
                header.innerHTML = header.textContent + indicator;
            }
        }
    });
}

// Función para comparar valores para la ordenación
function compareValues(a, b, column, direction) {
    // Manejar casos especiales
    if (column === 'vip' || column === 'usado') {
        const valueA = a[column] ? 1 : 0;
        const valueB = b[column] ? 1 : 0;
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
    }
    
    // Para fechas
    if (column === 'fecha_creacion') {
        const dateA = a[column] || a['fecha'] || '0';
        const dateB = b[column] || b['fecha'] || '0';
        return direction === 'asc' ? 
            new Date(dateA) - new Date(dateB) : 
            new Date(dateB) - new Date(dateA);
    }
    
    // Para valores numéricos o texto
    let valA = a[column] || '';
    let valB = b[column] || '';
    
    // Si son números, convertir para comparación numérica
    if (!isNaN(valA) && !isNaN(valB)) {
        valA = Number(valA);
        valB = Number(valB);
        return direction === 'asc' ? valA - valB : valB - valA;
    }
    
    // Comparación de texto
    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();
    
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
}

// Fetch recent scans (puede requerir un endpoint adicional)
function fetchRecentScans() {
    fetch("/recent-scans")
        .then(response => response.json())
        .then(data => {
            if (data.status === "success" && data.scans) {
                const tableBody = document.getElementById("recent-scans");
                if (!tableBody) return;
                
                tableBody.innerHTML = "";
                
                if (data.scans.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-3">No hay escaneos recientes</td></tr>`;
                    return;
                }
                
                data.scans.forEach(scan => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${scan.boleto || '-'}</td>
                        <td>${scan.email || '-'}</td>
                        <td>${scan.vip ? '<span class="badge bg-warning text-dark">VIP</span>' : '<span class="badge bg-secondary">Normal</span>'}</td>
                        <td class="d-none d-md-table-cell">${scan.usado ? '<span class="badge bg-danger">Usado</span>' : '<span class="badge bg-success">Disponible</span>'}</td>
                        <td class="d-none d-md-table-cell">${scan.fecha || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary view-details" data-ticket='${JSON.stringify(scan)}'>
                                <i class="bi bi-eye"></i> <span class="d-none d-md-inline">Ver</span>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                    
                    // Agregar event listener para ver detalles
                    row.querySelector('.view-details').addEventListener('click', function() {
                        const scanData = JSON.parse(this.getAttribute('data-ticket'));
                        showTicketDetails(scanData);
                    });
                });
            } else {
                const tableBody = document.getElementById("recent-scans");
                if (tableBody) {
                    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-3">No hay datos disponibles</td></tr>`;
                }
            }
        })
        .catch(error => {
            console.error("Error fetching recent scans:", error);
            // Si no hay endpoint para escaneos, mostrar mensaje genérico
            const tableBody = document.getElementById("recent-scans");
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-3">No hay datos de escaneos disponibles</td></tr>`;
            }
        });
}

// Función para enviar boletos
function sendQr() {
    submit.removeEventListener("click", sendQr);
    submit.disabled = true;
    loadingModal.style.display = "flex";

    const email = document.getElementById("email").value.toLowerCase(); // Normalizar email a minúsculas
    const fullname = document.getElementById("fullname").value;
    const tickets = document.getElementById("tickets").value;
    const ticket = document.getElementById("type").value;

    fetch("/sendQr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "email": email, "fullname": fullname, "tickets": tickets, "ticket": ticket })
    })
    .then(response => response.json())
    .then(data => {
        if (data.response === "success") {
            showNotification("¡Éxito!", data.message, "success");
            document.getElementById("fullname").value = "";
            document.getElementById("email").value = "";
            document.getElementById("tickets").value = 1;
            
            // Actualizar estadísticas
            fetchTicketStats(true);
        } else {
            showNotification("Error", data.message || "Ha ocurrido un error", "danger");
        }
    })
    .catch(error => {
        console.error(error);
        showNotification("Error", "Se ha presentado un error al enviar los boletos", "danger");
    })
    .finally(() => {
        loadingModal.style.display = "none";
        submit.disabled = false;
        submit.addEventListener("click", sendQr);
    });
}

// Mostrar detalles del boleto
function showTicketDetails(ticket) {
    document.getElementById('modal-boleto').textContent = ticket.boleto || '-';
    document.getElementById('modal-id').textContent = ticket.id || '-';
    document.getElementById('modal-tipo').innerHTML = ticket.vip ? 
        '<span class="badge bg-warning text-dark">VIP</span>' : 
        '<span class="badge bg-secondary">Normal</span>';
    document.getElementById('modal-estado').innerHTML = ticket.usado ? 
        '<span class="badge bg-danger">Usado</span>' : 
        '<span class="badge bg-success">Disponible</span>';
    document.getElementById('modal-email').textContent = ticket.email || '-';
    document.getElementById('modal-fecha-creacion').textContent = ticket.fecha_creacion || ticket.fecha || '-';
    document.getElementById('modal-fecha-uso').textContent = ticket.fecha_uso || '-';
    document.getElementById('modal-vendedor').textContent = ticket.vendedor || ticket.vendedor_email || '-';
    
    // Mostrar el modal
    const ticketDetailModal = new bootstrap.Modal(document.getElementById('ticketDetailModal'));
    ticketDetailModal.show();
}

// Configurar buscador de boletos
function setupTicketSearch() {
    const searchInput = document.getElementById("search-tickets");
    if (!searchInput) return;
    
    searchInput.addEventListener("input", function() {
        const searchTerm = this.value.toLowerCase().trim();
        renderTicketsTable(searchTerm);
    });
}

// Configurar botones de actualización
function setupRefreshButtons() {
    const refreshStatsBtn = document.getElementById("refresh-stats-btn");
    const refreshStatsDashboard = document.getElementById("refresh-stats-dashboard");
    
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener("click", function() {
            fetchTicketStats();
            showNotification("Actualizado", "Estadísticas actualizadas correctamente", "info");
        });
    }
    
    if (refreshStatsDashboard) {
        refreshStatsDashboard.addEventListener("click", function() {
            fetchTicketStats(true);
            fetchRecentTickets();
            showNotification("Actualizado", "Estadísticas actualizadas correctamente", "info");
        });
    }
}

// Show notification function
function showNotification(title, message, type) {
    const notifContainer = document.createElement("div");
    notifContainer.className = `alert alert-${type} alert-dismissible fade show notification-toast`;
    notifContainer.style.position = "fixed";
    notifContainer.style.top = "20px";
    notifContainer.style.right = "20px";
    notifContainer.style.zIndex = "1060";
    notifContainer.style.maxWidth = "90%";
    notifContainer.style.width = "350px";
    notifContainer.style.boxShadow = "0 5px 15px rgba(0,0,0,0.15)";
    notifContainer.innerHTML = `
        <strong>${title}</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(notifContainer);
    setTimeout(() => {
        notifContainer.classList.remove("show");
        setTimeout(() => notifContainer.remove(), 300);
    }, 5000);
}

// Inicialización al cargar el DOM
document.addEventListener("DOMContentLoaded", function () {
    // Inicializar variables globales
    submit = document.getElementById("submit");
    loadingModal = document.getElementById("loading-modal");
    submitText = document.querySelector(".submit-text");
    
    // Configurar funcionalidades
    setupNavigation();
    setupRefreshButtons();
    setupTicketSearch();
    
    // Agregar estilos para las columnas ordenables
    const style = document.createElement('style');
    style.textContent = `
        th.sortable {
            cursor: pointer;
            position: relative;
            user-select: none;
        }
        th.sortable:hover {
            background-color: rgba(0,0,0,0.05);
        }
        .dark-mode th.sortable:hover {
            background-color: rgba(255,255,255,0.05);
        }
    `;
    document.head.appendChild(style);
    
    // Try to load initial stats
    try {
        fetchTicketStats(true);
    } catch (e) {
        console.log("Stats endpoint might not exist yet");
    }
    
    // Add event listener to the form
    if (submit) {
        submit.addEventListener("click", sendQr);
    }
});
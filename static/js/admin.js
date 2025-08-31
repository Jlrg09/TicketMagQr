// Variables globales para optimización
let codesData = [];
let filteredCodesData = [];
let isLoadingCodes = false;
let currentPage = 1;
const CODES_PER_PAGE = 50;
let searchInitialized = false; // Evitar inicialización múltiple

// Función optimizada para crear elementos reutilizables
const ElementCreator = {
    cache: new Map(),
    
    createButton(className, title, icon, dataAttrs = {}) {
        const btn = document.createElement('button');
        btn.className = className;
        btn.title = title;
        btn.innerHTML = `<i class="bi ${icon}"></i>`;
        
        Object.entries(dataAttrs).forEach(([key, value]) => {
            btn.setAttribute(key, value);
        });
        
        return btn;
    },
    
    createBadge(text, bgClass) {
        return `<span class="badge ${bgClass}">${text}</span>`;
    }
};

// Optimizar la renderización de tablas usando DocumentFragment
function renderCodesTable(codes, startIndex = 0, endIndex = codes.length) {
    const tableBody = document.getElementById('codesTableBody');
    if (!tableBody) return;
    
    const fragment = document.createDocumentFragment();
    
    // Solo renderizar la porción visible
    const visibleCodes = codes.slice(startIndex, endIndex);
    
    visibleCodes.forEach(code => {
        const row = document.createElement('tr');
        
        // Crear contenido usando template literals optimizado
        row.innerHTML = `
            <td>${code.boleto}</td>
            <td>${code.id}</td>
            <td>${code.usado ? ElementCreator.createBadge('Usado', 'bg-danger') : ElementCreator.createBadge('Libre', 'bg-success')}</td>
            <td>${code.vip ? ElementCreator.createBadge('VIP', 'bg-warning text-dark') : ElementCreator.createBadge('Normal', 'bg-secondary')}</td>
            <td class="d-none d-md-table-cell">${code.email || '-'}</td>
            <td class="d-none d-md-table-cell">${code.fecha_creacion || '-'}</td>
            <td class="d-none d-md-table-cell">${code.fecha_uso || '-'}</td>
            <td class="d-none d-md-table-cell">${code.vendedor_email || '-'}</td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary view-details" data-code-id="${code.id}" title="Ver detalles">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info edit-ticket" data-code-id="${code.id}" title="Editar boleto">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${!code.usado ? `
                    <button class="btn btn-sm btn-outline-success mark-used" data-code-id="${code.id}" title="Marcar como usado">
                        <i class="bi bi-check-lg"></i>
                    </button>` : ''}
                    <button class="btn btn-sm btn-outline-danger delete-ticket" data-code-id="${code.id}" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        fragment.appendChild(row);
    });
    
    // Limpiar y añadir el fragmento de una vez
    if (startIndex === 0) {
        tableBody.innerHTML = '';
    }
    tableBody.appendChild(fragment);
}

// Manejador centralizado de eventos de tabla
function handleTableClick(e) {
    const target = e.target.closest('button');
    if (!target) return;
    
    const codeId = target.getAttribute('data-code-id');
    if (!codeId) return;
    
    const code = codesData.find(c => c.id == codeId);
    if (!code) return;
    
    // Manejar acciones específicas
    if (target.classList.contains('view-details')) {
        showTicketDetails(code);
    } else if (target.classList.contains('edit-ticket')) {
        editTicket(codeId, code);
    } else if (target.classList.contains('mark-used')) {
        markTicketAsUsed(codeId);
    } else if (target.classList.contains('delete-ticket')) {
        confirmDeleteTicket(codeId, code.boleto);
    }
}

// Función optimizada para cargar códigos con paginación
function loadCodes() {
    if (isLoadingCodes) return;
    
    isLoadingCodes = true;
    showLoadingIndicator();
    
    fetch('/admin/get_codes')
        .then(response => response.json())
        .then(data => {
            if (data.response === 'success') {
                codesData = data.codes;
                filteredCodesData = [...codesData]; // Inicializar datos filtrados
                currentPage = 1;
                
                // Actualizar estadísticas inmediatamente
                updateStats(codesData);
                
                // Renderizar solo la primera página
                renderCodesTable(filteredCodesData, 0, CODES_PER_PAGE);
                
                // Configurar event listeners
                setupTableEventListeners();
                
                // Configurar búsqueda después de renderizar
                setupSearch();
                
                // Cargar actividad reciente y gráficos de forma asíncrona
                requestAnimationFrame(() => {
                    loadRecentActivity(codesData);
                    
                    const usedTickets = codesData.filter(code => code.usado).length;
                    const availableTickets = codesData.length - usedTickets;
                    const vipTickets = codesData.filter(code => code.vip).length;
                    
                    initCharts(usedTickets, availableTickets, vipTickets, codesData.length - vipTickets);
                });
                
                // Implementar scroll infinito si hay muchos códigos
                if (filteredCodesData.length > CODES_PER_PAGE) {
                    setupInfiniteScroll();
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al cargar los códigos', 'danger');
        })
        .finally(() => {
            isLoadingCodes = false;
            hideLoadingIndicator();
        });
}

// Configurar event listeners de tabla
function setupTableEventListeners() {
    const tableBody = document.getElementById('codesTableBody');
    if (!tableBody) return;
    
    // Remover listeners anteriores para evitar duplicados
    tableBody.removeEventListener('click', handleTableClick);
    tableBody.addEventListener('click', handleTableClick);
}

// Configurar búsqueda - CORREGIDO para evitar duplicados y errores de contexto
function setupSearch() {
    if (searchInitialized) return;
    
    const searchInput = document.getElementById('codesSearchInput');
    if (!searchInput) {
        console.log('Input de búsqueda no encontrado');
        return;
    }
    
    // Marcar como inicializado
    searchInitialized = true;
    
    // Remover cualquier listener existente
    searchInput.removeEventListener('input', searchInput.searchHandler);
    
    // Crear función manejadora para mantener el contexto
    searchInput.searchHandler = debounce(function(event) {
        performSearch(event.target.value);
    }, 300);
    
    // Añadir el nuevo listener
    searchInput.addEventListener('input', searchInput.searchHandler);
    
    console.log('Búsqueda configurada correctamente'); // Debug
}

// Función separada para realizar la búsqueda - CORREGIDA
function performSearch(searchValue) {
    const term = searchValue ? searchValue.toLowerCase().trim() : '';
    
    console.log('Realizando búsqueda:', term); // Debug
    
    if (term === '') {
        // Mostrar todos los códigos
        filteredCodesData = [...codesData];
    } else {
        // Filtrar códigos usando los campos correctos de la BD
        filteredCodesData = codesData.filter(code => {
            const boleto = code.boleto ? code.boleto.toString().toLowerCase() : '';
            const id = code.id ? code.id.toString().toLowerCase() : '';
            const email = code.email ? code.email.toLowerCase() : '';
            const vendedor = code.vendedor_email ? code.vendedor_email.toLowerCase() : '';
            
            return boleto.includes(term) || 
                   id.includes(term) || 
                   email.includes(term) || 
                   vendedor.includes(term);
        });
    }
    
    console.log('Resultados filtrados:', filteredCodesData.length); // Debug
    
    // Reset pagination
    currentPage = 1;
    
    // Re-renderizar tabla con datos filtrados
    renderCodesTable(filteredCodesData, 0, Math.min(CODES_PER_PAGE, filteredCodesData.length));
    
    // Reconfigurar scroll infinito
    if (filteredCodesData.length > CODES_PER_PAGE) {
        setupInfiniteScroll();
    }
}

// Configurar scroll infinito para cargas grandes
function setupInfiniteScroll() {
    const tableContainer = document.querySelector('.table-responsive');
    if (!tableContainer) return;
    
    // Remover listener anterior si existe
    if (tableContainer.scrollHandler) {
        tableContainer.removeEventListener('scroll', tableContainer.scrollHandler);
    }
    
    tableContainer.scrollHandler = debounce(() => {
        if (tableContainer.scrollTop + tableContainer.clientHeight >= tableContainer.scrollHeight - 100) {
            loadMoreCodes();
        }
    }, 250);
    
    tableContainer.addEventListener('scroll', tableContainer.scrollHandler);
}

// Cargar más códigos cuando se hace scroll
function loadMoreCodes() {
    const startIndex = currentPage * CODES_PER_PAGE;
    const endIndex = Math.min(startIndex + CODES_PER_PAGE, filteredCodesData.length);
    
    if (startIndex < filteredCodesData.length) {
        const tableBody = document.getElementById('codesTableBody');
        const fragment = document.createDocumentFragment();
        
        const visibleCodes = filteredCodesData.slice(startIndex, endIndex);
        
        visibleCodes.forEach(code => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${code.boleto}</td>
                <td>${code.id}</td>
                <td>${code.usado ? ElementCreator.createBadge('Usado', 'bg-danger') : ElementCreator.createBadge('Libre', 'bg-success')}</td>
                <td>${code.vip ? ElementCreator.createBadge('VIP', 'bg-warning text-dark') : ElementCreator.createBadge('Normal', 'bg-secondary')}</td>
                <td class="d-none d-md-table-cell">${code.email || '-'}</td>
                <td class="d-none d-md-table-cell">${code.fecha_creacion || '-'}</td>
                <td class="d-none d-md-table-cell">${code.fecha_uso || '-'}</td>
                <td class="d-none d-md-table-cell">${code.vendedor_email || '-'}</td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-outline-primary view-details" data-code-id="${code.id}" title="Ver detalles">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info edit-ticket" data-code-id="${code.id}" title="Editar boleto">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${!code.usado ? `
                        <button class="btn btn-sm btn-outline-success mark-used" data-code-id="${code.id}" title="Marcar como usado">
                            <i class="bi bi-check-lg"></i>
                        </button>` : ''}
                        <button class="btn btn-sm btn-outline-danger delete-ticket" data-code-id="${code.id}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            fragment.appendChild(row);
        });
        
        tableBody.appendChild(fragment);
        currentPage++;
    }
}

// Función debounce para optimizar eventos
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

// Indicadores de carga
function showLoadingIndicator() {
    const tableBody = document.getElementById('codesTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center"><div class="spinner-border spinner-border-sm me-2"></div>Cargando...</td></tr>';
    }
}

function hideLoadingIndicator() {
    // El indicador se oculta automáticamente cuando se cargan los datos
}

// Función optimizada para confirmar eliminación
function confirmDeleteTicket(ticketId, boleto) {
    document.getElementById('confirmDeleteMessage').textContent = 
        `¿Estás seguro que deseas eliminar el boleto #${boleto}? Esta acción no se puede deshacer.`;
    
    window.deleteItemType = 'ticket';
    window.deleteItemId = ticketId;
    
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    confirmModal.show();
}

// Actualizar función de actividad reciente para mejor performance
function loadRecentActivity(codes) {
    if (!codes || codes.length === 0) return;
    
    // Optimizar ordenamiento
    const sortedCodes = codes
        .filter(code => code.usado || code.fecha_creacion)
        .sort((a, b) => {
            if (a.usado && !b.usado) return -1;
            if (!a.usado && b.usado) return 1;
            
            const dateA = a.usado ? 
                (a.fecha_uso ? new Date(a.fecha_uso) : new Date(0)) :
                (a.fecha_creacion ? new Date(a.fecha_creacion) : new Date(0));
            const dateB = b.usado ? 
                (b.fecha_uso ? new Date(b.fecha_uso) : new Date(0)) :
                (b.fecha_creacion ? new Date(b.fecha_creacion) : new Date(0));
            
            return dateB - dateA;
        })
        .slice(0, 10);
    
    const tableBody = document.getElementById('recentActivityTable');
    if (!tableBody) return;
    
    const fragment = document.createDocumentFragment();
    
    sortedCodes.forEach(code => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${code.boleto}</td>
            <td>${code.vip ? ElementCreator.createBadge('VIP', 'bg-warning text-dark') : ElementCreator.createBadge('Normal', 'bg-secondary')}</td>
            <td>${code.usado ? ElementCreator.createBadge('Usado', 'bg-danger') : ElementCreator.createBadge('Libre', 'bg-success')}</td>
            <td class="d-none d-md-table-cell">${code.email || '-'}</td>
            <td class="d-none d-md-table-cell">${code.fecha_uso || '-'}</td>
            <td class="d-none d-md-table-cell">${code.vendedor_email || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="showTicketDetails(${JSON.stringify(code).replace(/"/g, '&quot;')})" title="Ver detalles">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        `;
        fragment.appendChild(row);
    });
    
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
}

// Función para resetear la búsqueda cuando se cambia de pestaña
function resetSearch() {
    searchInitialized = false;
    const searchInput = document.getElementById('codesSearchInput');
    if (searchInput) {
        searchInput.value = '';
        if (searchInput.searchHandler) {
            searchInput.removeEventListener('input', searchInput.searchHandler);
            delete searchInput.searchHandler;
        }
    }
}

// Función para configurar búsqueda de usuarios - NUEVA Y CORREGIDA
function setupUserSearch() {
    const userSearchInput = document.getElementById('userSearchInput');
    if (!userSearchInput) return;
    
    // Remover cualquier listener existente
    if (userSearchInput.userSearchHandler) {
        userSearchInput.removeEventListener('input', userSearchInput.userSearchHandler);
    }
    
    // Crear función manejadora para mantener el contexto
    userSearchInput.userSearchHandler = debounce(function(event) {
        performUserSearch(event.target.value);
    }, 300);
    
    // Añadir el nuevo listener
    userSearchInput.addEventListener('input', userSearchInput.userSearchHandler);
    
    console.log('Búsqueda de usuarios configurada correctamente'); // Debug
}

// Función separada para realizar la búsqueda de usuarios - NUEVA
function performUserSearch(searchValue) {
    const searchTerm = searchValue ? searchValue.toLowerCase().trim() : '';
    const rows = document.getElementById('usersTableBody')?.querySelectorAll('tr') || [];
    
    console.log('Realizando búsqueda de usuarios:', searchTerm); // Debug
    
    rows.forEach(row => {
        const email = row.cells[1]?.textContent.toLowerCase() || '';
        const id = row.cells[0]?.textContent.toLowerCase() || '';
        
        if (searchTerm === '' || email.includes(searchTerm) || id.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Inicializar navegación mejorada para el panel
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando admin panel'); // Debug
    
    // Variables para gestionar eliminación
    let deleteItemType = '';
    let deleteItemId = '';

    // Añadir opciones de navegación al navbar
    const navbar = document.querySelector('.navbar-nav');
    
    // Comprobar si ya existen elementos del menú (para evitar duplicados)
    if (!document.querySelector('#nav-dashboard')) {
        // Crear menú de navegación dinámico
        const navItems = [
            { id: 'dashboard', icon: 'bi-speedometer2', text: 'Dashboard' },
            { id: 'users', icon: 'bi-people', text: 'Usuarios' },
            { id: 'codes', icon: 'bi-qr-code', text: 'Códigos' },
            { id: 'config', icon: 'bi-gear', text: 'Configuración' }
        ];
        
        // Añadir elementos al navbar si existe
        if (navbar) {
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
            
            // Añadir enlace al escáner QR si no existe
            if (!document.querySelector('.navbar-nav a[href="/admin/qr-scanner"]')) {
                const li = document.createElement('li');
                li.className = 'nav-item';
                
                const link = document.createElement('a');
                link.className = 'nav-link';
                link.href = '/admin/qr-scanner';
                link.innerHTML = '<i class="bi bi-qr-code-scan me-md-2"></i> <span>Escáner QR</span>';
                
                li.appendChild(link);
                navbar.appendChild(li);
            }
        }
    } else {
        // Si ya existen, añadir los event listeners
        document.querySelectorAll('.navbar-nav a[href^="#"]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                showPanel(targetId);
            });
        });
    }
    
    // Cargar datos iniciales
    loadCodes();
    
    // Toggle password visibility
    document.getElementById('togglePasswordBtn')?.addEventListener('click', function() {
        const passwordInput = document.getElementById('passwordConfig');
        const icon = this.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        }
    });
    
    // Toggle user password visibility
    document.getElementById('toggleUserPasswordBtn')?.addEventListener('click', function() {
        togglePassword('userPassword', this);
    });
    
    // Toggle edit user password visibility
    document.getElementById('toggleEditPasswordBtn')?.addEventListener('click', function() {
        togglePassword('editUserPassword', this);
    });
    
    function togglePassword(inputId, button) {
        const passwordInput = document.getElementById(inputId);
        const icon = button.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        }
    }
    
    // Mostrar campo de código admin al crear usuario
    document.getElementById('isAdmin')?.addEventListener('change', function() {
        document.getElementById('adminCodeContainer').style.display = this.checked ? 'block' : 'none';
    });
    
    // Mostrar campo de código admin al editar usuario
    document.getElementById('editIsAdmin')?.addEventListener('change', function() {
        document.getElementById('editAdminCodeContainer').style.display = this.checked ? 'block' : 'none';
    });
    
    // Email config form handler
    document.getElementById('emailConfigForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('emailConfig').value.toLowerCase(); 
        const password = document.getElementById('passwordConfig').value;
        const emailSubject = document.getElementById('emailSubject').value;
        const emailBody = document.getElementById('emailBody').value;
        
        fetch('/admin/update_config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email, 
                password, 
                email_subject: emailSubject, 
                email_body: emailBody 
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.response === 'success') {
                showNotification('Configuración actualizada con éxito', 'success');
                document.getElementById('passwordConfig').value = '';
            } else {
                showNotification('Error: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al actualizar la configuración', 'danger');
        });
    });
    
    // Crear usuario
    document.getElementById('saveUserBtn')?.addEventListener('click', function() {
        const email = document.getElementById('userEmail').value.toLowerCase(); 
        const password = document.getElementById('userPassword').value;
        const isAdmin = document.getElementById('isAdmin').checked;
        const adminCode = document.getElementById('userAdminCode').value;
        
        fetch('/admin/create_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email, 
                password, 
                is_admin: isAdmin,
                admin_code: isAdmin ? adminCode : null
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.response === 'success') {
                showNotification('Usuario creado con éxito', 'success');
                document.getElementById('createUserForm').reset();
                document.getElementById('adminCodeContainer').style.display = 'none';
                document.getElementById('createUserModal').querySelector('.btn-close').click();
                loadUsers();
            } else {
                showNotification('Error: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al crear usuario', 'danger');
        });
    });

    // Editar usuario
    document.getElementById('updateUserBtn')?.addEventListener('click', function() {
        const userId = document.getElementById('editUserId').value;
        const email = document.getElementById('editUserEmail').value.toLowerCase();
        const password = document.getElementById('editUserPassword').value;
        const isAdmin = document.getElementById('editIsAdmin').checked;
        const adminCode = document.getElementById('editUserAdminCode').value;

        const userData = { 
            id: userId,
            email: email, 
            is_admin: isAdmin
        };

        // Sólo incluir password si se ingresó uno nuevo
        if (password) {
            userData.password = password;
        }

        // Incluir admin_code solo si es admin y hay un código
        if (isAdmin && adminCode) {
            userData.admin_code = adminCode;
        }
        
        fetch('/admin/update_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.response === 'success') {
                showNotification('Usuario actualizado con éxito', 'success');
                document.getElementById('editUserModal').querySelector('.btn-close').click();
                loadUsers();
            } else {
                showNotification('Error: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al actualizar usuario', 'danger');
        });
    });

    // Editar boleto desde el botón en el modal de detalles
    document.getElementById('modal-edit-ticket')?.addEventListener('click', function() {
        const ticketId = document.getElementById('modal-id').textContent;
        const ticketEmail = document.getElementById('modal-email').textContent;
        const ticketVendor = document.getElementById('modal-vendedor').textContent;
        const ticketType = document.getElementById('modal-tipo').textContent.includes('VIP') ? 'vip' : 'normal';
        const ticketStatus = document.getElementById('modal-estado').textContent.includes('Usado') ? '1' : '0';
        
        // Cerrar modal de detalles y abrir modal de edición
        bootstrap.Modal.getInstance(document.getElementById('ticketDetailModal')).hide();
        
        // Configurar valores en el formulario de edición
        document.getElementById('editTicketId').value = ticketId;
        document.getElementById('editTicketEmail').value = ticketEmail !== '-' ? ticketEmail : '';
        document.getElementById('editTicketVendor').value = ticketVendor !== '-' ? ticketVendor : '';
        document.getElementById('editTicketType').value = ticketType;
        document.getElementById('editTicketStatus').value = ticketStatus;
        
        // Mostrar modal de edición
        const editModal = new bootstrap.Modal(document.getElementById('editTicketModal'));
        editModal.show();
    });

    // Actualizar boleto - CORREGIDO para usar vendedor_email
    document.getElementById('updateTicketBtn')?.addEventListener('click', function() {
        const ticketId = document.getElementById('editTicketId').value;
        const email = document.getElementById('editTicketEmail').value.toLowerCase();
        const vendor = document.getElementById('editTicketVendor').value;
        const type = document.getElementById('editTicketType').value;
        const status = document.getElementById('editTicketStatus').value === '1';
        
        fetch('/admin/update_ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                id: ticketId,
                email: email, 
                vendedor_email: vendor,
                vip: type === 'vip',
                usado: status
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.response === 'success') {
                showNotification('Boleto actualizado con éxito', 'success');
                document.getElementById('editTicketModal').querySelector('.btn-close').click();
                
                // Actualizar datos locales en lugar de recargar todo
                const codeIndex = codesData.findIndex(c => c.id == ticketId);
                if (codeIndex !== -1) {
                    codesData[codeIndex] = {
                        ...codesData[codeIndex],
                        email: email,
                        vendedor_email: vendor,
                        vip: type === 'vip',
                        usado: status
                    };
                    
                    // Actualizar también datos filtrados si están en uso
                    const filteredIndex = filteredCodesData.findIndex(c => c.id == ticketId);
                    if (filteredIndex !== -1) {
                        filteredCodesData[filteredIndex] = { ...codesData[codeIndex] };
                    }
                    
                    // Re-renderizar solo la tabla visible
                    renderCodesTable(filteredCodesData, 0, Math.min(CODES_PER_PAGE, filteredCodesData.length));
                    updateStats(codesData);
                }
            } else {
                showNotification('Error: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al actualizar boleto', 'danger');
        });
    });

    // Marcar boleto como usado desde modal
    document.getElementById('modal-mark-used')?.addEventListener('click', function() {
        const ticketId = this.getAttribute('data-ticket-id');
        if (!ticketId) return;
        
        fetch(`/scan/${ticketId}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === "válido") {
                    showNotification('Boleto marcado como usado correctamente', 'success');
                    
                    // Actualizar datos locales
                    const codeIndex = codesData.findIndex(c => c.id == ticketId);
                    if (codeIndex !== -1) {
                        codesData[codeIndex].usado = true;
                        codesData[codeIndex].fecha_uso = new Date().toISOString();
                        
                        // Actualizar también datos filtrados
                        const filteredIndex = filteredCodesData.findIndex(c => c.id == ticketId);
                        if (filteredIndex !== -1) {
                            filteredCodesData[filteredIndex] = { ...codesData[codeIndex] };
                        }
                    }
                    
                    renderCodesTable(filteredCodesData, 0, Math.min(CODES_PER_PAGE, filteredCodesData.length));
                    updateStats(codesData);
                    document.querySelector('#ticketDetailModal .btn-close')?.click();
                } else {
                    showNotification('Error: ' + data.message, 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error al marcar el boleto', 'danger');
            });
    });

    // Configurar modal de confirmación de eliminación
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', function() {
        if (window.deleteItemType === 'user') {
            deleteUser(window.deleteItemId);
        } else if (window.deleteItemType === 'ticket') {
            deleteTicket(window.deleteItemId);
        }
    });

    // Funciones para eliminar usuarios y boletos
    function deleteUser(userId) {
        fetch('/admin/delete_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: userId }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.response === 'success') {
                showNotification('Usuario eliminado con éxito', 'success');
                bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
                loadUsers();
            } else {
                showNotification('Error: ' + (data.message || 'No se pudo eliminar el usuario'), 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al eliminar usuario', 'danger');
        });
    }

    function deleteTicket(ticketId) {
        fetch('/admin/delete_ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: ticketId }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.response === 'success') {
                showNotification('Boleto eliminado con éxito', 'success');
                bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
                
                // Actualizar datos locales
                codesData = codesData.filter(c => c.id != ticketId);
                filteredCodesData = filteredCodesData.filter(c => c.id != ticketId);
                renderCodesTable(filteredCodesData, 0, Math.min(CODES_PER_PAGE, filteredCodesData.length));
                updateStats(codesData);
            } else {
                showNotification('Error: ' + (data.message || 'No se pudo eliminar el boleto'), 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al eliminar boleto', 'danger');
        });
    }
});

// Función para mostrar un panel y ocultar los demás
function showPanel(panelId) {
    console.log('Mostrando panel:', panelId); // Debug
    
    // Resetear búsqueda cuando se cambia de pestaña
    if (panelId !== 'codes') {
        resetSearch();
    }
    
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
    
    // Cargar los datos correspondientes
    loadTabData(panelId);
}

// Función para cargar datos según la pestaña activa
function loadTabData(tabId) {
    if (tabId === 'users') {
        loadUsers();
    } else if (tabId === 'codes') {
        if (codesData.length === 0) {
            loadCodes();
        } else {
            // Re-configurar búsqueda si ya hay datos y el input existe
            if (document.getElementById('codesSearchInput') && !searchInitialized) {
                setupSearch();
            }
        }
    } else if (tabId === 'config') {
        loadConfig();
    } else if (tabId === 'dashboard') {
        if (codesData.length === 0) {
            loadCodes();
        }
    }
}

// Inicializar gráficos
function initCharts(usedCount, availableCount, vipCount, normalCount) {
    // Gráfico de estadísticas de boletos
    const ctx = document.getElementById('ticketStatsChart');
    if (!ctx) return;
    
    // Destruir gráfico existente si lo hay
    if (window.ticketChart) {
        window.ticketChart.destroy();
    }
    
    window.ticketChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Total', 'Disponibles', 'Usados', 'VIP', 'Normal'],
            datasets: [{
                label: 'Cantidad de Boletos',
                data: [usedCount + availableCount, availableCount, usedCount, vipCount, (usedCount + availableCount) - vipCount],
                backgroundColor: [
                    'rgba(58, 134, 255, 0.6)',
                    'rgba(46, 204, 113, 0.6)',
                    'rgba(231, 76, 60, 0.6)',
                    'rgba(243, 156, 18, 0.6)',
                    'rgba(149, 165, 166, 0.6)'
                ],
                borderColor: [
                    'rgba(58, 134, 255, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(231, 76, 60, 1)',
                    'rgba(243, 156, 18, 1)',
                    'rgba(149, 165, 166, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    precision: 0
                }
            }
        }
    });
}

// Función para cargar usuarios
function loadUsers() {
    fetch('/admin/get_users')
        .then(response => response.json())
        .then(data => {
            if (data.response === 'success') {
                const tableBody = document.getElementById('usersTableBody');
                if (!tableBody) return;
                
                const fragment = document.createDocumentFragment();
                
                data.users.forEach(user => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${user.id}</td>
                        <td>${user.email}</td>
                        <td>${user.is_admin ? '<span class="badge bg-primary">Admin</span>' : '<span class="badge bg-secondary">Usuario</span>'}</td>
                        <td>
                            <div class="d-flex gap-1">
                                <button class="btn btn-sm btn-outline-primary edit-user" title="Editar" data-id="${user.id}" data-email="${user.email}" data-is-admin="${user.is_admin}">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-user" title="Eliminar" data-id="${user.id}">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    fragment.appendChild(row);
                    
                    // Agregar event listener para editar usuario
                    row.querySelector('.edit-user').addEventListener('click', function() {
                        const userId = this.getAttribute('data-id');
                        const userEmail = this.getAttribute('data-email');
                        const isAdmin = this.getAttribute('data-is-admin') === 'true';
                        
                        document.getElementById('editUserId').value = userId;
                        document.getElementById('editUserEmail').value = userEmail;
                        document.getElementById('editUserPassword').value = '';
                        document.getElementById('editIsAdmin').checked = isAdmin;
                        document.getElementById('editAdminCodeContainer').style.display = isAdmin ? 'block' : 'none';
                        
                        const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
                        editUserModal.show();
                    });
                    
                    // Agregar event listener para eliminar usuario
                    row.querySelector('.delete-user').addEventListener('click', function() {
                        const userId = this.getAttribute('data-id');
                        const userEmail = row.cells[1].textContent;
                        
                        // Configurar modal de confirmación
                        document.getElementById('confirmDeleteMessage').textContent = 
                            `¿Estás seguro que deseas eliminar el usuario "${userEmail}"? Esta acción no se puede deshacer.`;
                        
                        // Guardar datos para la eliminación
                        window.deleteItemType = 'user';
                        window.deleteItemId = userId;
                        
                        // Mostrar modal de confirmación
                        const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
                        confirmModal.show();
                    });
                });
                
                tableBody.innerHTML = '';
                tableBody.appendChild(fragment);
                
                // Configurar búsqueda de usuarios después de cargar los datos
                setupUserSearch();
            }
        })
        .catch(error => console.error('Error:', error));
}

// Función para editar boleto
function editTicket(ticketId, ticketData) {
    // Configurar el formulario con los datos actuales
    document.getElementById('editTicketId').value = ticketId;
    document.getElementById('editTicketEmail').value = ticketData.email || '';
    document.getElementById('editTicketType').value = ticketData.vip ? 'vip' : 'normal';
    document.getElementById('editTicketStatus').value = ticketData.usado ? '1' : '0';
    document.getElementById('editTicketVendor').value = ticketData.vendedor_email || '';
    
    // Mostrar el modal de edición
    const editModal = new bootstrap.Modal(document.getElementById('editTicketModal'));
    editModal.show();
}

// Función para actualizar estadísticas
function updateStats(codes) {
    if (!codes) return;
    
    const totalTickets = codes.length;
    const usedTickets = codes.filter(code => code.usado).length;
    const availableTickets = totalTickets - usedTickets;
    const vipTickets = codes.filter(code => code.vip).length;
    
    const totalElement = document.getElementById('total-tickets');
    const usedElement = document.getElementById('used-tickets');
    const availableElement = document.getElementById('available-tickets');
    const vipElement = document.getElementById('vip-tickets');
    
    if (totalElement) totalElement.textContent = totalTickets;
    if (usedElement) usedElement.textContent = usedTickets;
    if (availableElement) availableElement.textContent = availableTickets;
    if (vipElement) vipElement.textContent = vipTickets;
}

// Mostrar detalles del boleto en un modal
function showTicketDetails(code) {
    document.getElementById('modal-boleto').textContent = code.boleto;
    document.getElementById('modal-id').textContent = code.id;
    document.getElementById('modal-tipo').innerHTML = code.vip ? 
        '<span class="badge bg-warning text-dark">VIP</span>' : 
        '<span class="badge bg-secondary">Normal</span>';
    document.getElementById('modal-estado').innerHTML = code.usado ? 
        '<span class="badge bg-danger">Usado</span>' : 
        '<span class="badge bg-success">Disponible</span>';
    document.getElementById('modal-email').textContent = code.email || '-';
    document.getElementById('modal-fecha-creacion').textContent = code.fecha_creacion || '-';
    document.getElementById('modal-fecha-uso').textContent = code.fecha_uso || '-';
    document.getElementById('modal-vendedor').textContent = code.vendedor_email || '-';
    
    const markUsedBtn = document.getElementById('modal-mark-used');
    if (code.usado) {
        markUsedBtn.style.display = 'none';
    } else {
        markUsedBtn.style.display = 'inline-flex';
        markUsedBtn.setAttribute('data-ticket-id', code.id);
    }
    
    // Mostrar el modal
    const ticketDetailModal = new bootstrap.Modal(document.getElementById('ticketDetailModal'));
    ticketDetailModal.show();
}

// Marcar boleto como usado
function markTicketAsUsed(ticketId) {
    fetch(`/scan/${ticketId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === "válido") {
                showNotification('Boleto marcado como usado correctamente', 'success');
                
                // Actualizar datos locales
                const codeIndex = codesData.findIndex(c => c.id == ticketId);
                if (codeIndex !== -1) {
                    codesData[codeIndex].usado = true;
                    codesData[codeIndex].fecha_uso = new Date().toISOString();
                    
                    // Actualizar también datos filtrados
                    const filteredIndex = filteredCodesData.findIndex(c => c.id == ticketId);
                    if (filteredIndex !== -1) {
                        filteredCodesData[filteredIndex] = { ...codesData[codeIndex] };
                    }
                }
                
                renderCodesTable(filteredCodesData, 0, Math.min(CODES_PER_PAGE, filteredCodesData.length));
                updateStats(codesData);
            } else {
                showNotification('Error: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al marcar el boleto', 'danger');
        });
}

// Función para cargar configuración
function loadConfig() {
    fetch('/admin/get_config')
        .then(response => response.json())
        .then(data => {
            if (data.response === 'success') {
                const emailConfigElement = document.getElementById('emailConfig');
                const emailSubjectElement = document.getElementById('emailSubject');
                const emailBodyElement = document.getElementById('emailBody');
                
                if (emailConfigElement) emailConfigElement.value = data.config.email;
                if (emailSubjectElement) emailSubjectElement.value = data.config.email_subject || 'Codigo QR Chico Talento';
                if (emailBodyElement) emailBodyElement.value = data.config.email_body || '¡Hola! {name} Gracias por tu compra, con el siguiente código puedes confirmar tu entrada al evento de chico talento que se estará realziando el día 11 de Abril del 2024 a las 5:00PM en el emiciclo Helado de Leche.';
            }
        })
        .catch(error => console.error('Error:', error));
}

// Función para mostrar notificaciones
function showNotification(message, type) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => notification.remove(), 300);
    });

    // Create new notification
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification notification-${type}`;
    
    let icon = type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle';
    let title = type === 'success' ? 'Éxito' : 'Error';
    
    notificationDiv.innerHTML = `
        <div class="notification-icon">
            <i class="bi ${icon}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div>${message}</div>
        </div>
        <button class="notification-close">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    document.body.appendChild(notificationDiv);
    
    // Add close functionality
    notificationDiv.querySelector('.notification-close').addEventListener('click', function() {
        notificationDiv.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => notificationDiv.remove(), 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notificationDiv)) {
            notificationDiv.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notificationDiv.remove(), 300);
        }
    }, 5000);
}
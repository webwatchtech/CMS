let creditors = JSON.parse(localStorage.getItem('creditors')) || [];
let currentCreditorId = null;

// Date formatting function
function formatDate(date) {
    if (!date) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Initialize current date display
document.getElementById('current-date').textContent = formatDate(new Date());

// Search functionality
document.getElementById('searchInput').addEventListener('input', function(e) {
    const searchTerm = e.target.value.trim().toUpperCase();
    const filteredCreditors = creditors.filter(creditor => 
        creditor.name.toUpperCase().includes(searchTerm) || 
        creditor.status.toUpperCase().includes(searchTerm) ||
        creditor.lastVisitDate.includes(searchTerm) ||
        (creditor.followUpDate && creditor.followUpDate.includes(searchTerm))
    );
    renderFilteredCreditors(filteredCreditors);
});

function recordHistory(creditorId, action, details, amount = null) {
    const creditor = creditors.find(c => c.id === creditorId);
    if (!creditor.history) creditor.history = [];
    
    creditor.history.push({
        date: new Date().toISOString(),
        action: action,
        details: details,
        amount: amount
    });
    saveToLocalStorage();
}

function renderFilteredCreditors(filteredCreditors) {
    const container = document.getElementById('creditors-container');
    container.innerHTML = filteredCreditors.map(creditor => `
        <tr>
            <td class="name-column clickable" onclick="showHistoryPanel(${creditor.id})">
                ${creditor.name}
                ${creditor.status === 'overdue' ? 
                    '<span class="status-indicator"><div class="status-dot overdue"></div> OVERDUE</span>' : ''}
            </td>
            <td>${formatDate(new Date(creditor.lastVisitDate))}</td>
            <td>${creditor.followUpDate ? formatDate(new Date(creditor.followUpDate)) : '-'}</td>
            <td>
                <div class="status-indicator">
                    <div class="status-dot ${creditor.status}"></div>
                    ${creditor.status.toUpperCase()}
                </div>
            </td>
            <td class="actions-cell">
                <button class="btn-success" onclick="markPaid(${creditor.id})">💵</button>
                <button class="btn-primary" onclick="showCalendar(${creditor.id})">📅</button>
            </td>
        </tr>
    `).join('');

    if (filteredCreditors.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem;">
                    No matching creditors found
                </td>
            </tr>
        `;
    }
}

function getNextTuesday() {
    const date = new Date();
    date.setDate(date.getDate() + (2 - date.getDay() + 7) % 7 || 7);
    return date.toISOString().split('T')[0];
}

function isNameDuplicate(name) {
    return creditors.some(creditor => 
        creditor.name.toUpperCase() === name.toUpperCase()
    );
}

function sortCreditors() {
    const paid = creditors.filter(c => c.status === 'paid');
    const unpaid = creditors.filter(c => c.status !== 'paid');
    
    unpaid.sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));
    paid.sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));
    
    creditors = [...unpaid, ...paid];
}

function addCreditor() {
    const nameInput = document.getElementById('name');
    const name = nameInput.value.trim().toUpperCase();
    const errorElement = document.getElementById('name-error');
    
    // Clear previous errors
    nameInput.classList.remove('error');
    errorElement.textContent = '';
    
    if (!name) {
        errorElement.textContent = 'Please enter a creditor name';
        nameInput.classList.add('error');
        return;
    }
    
    if (isNameDuplicate(name)) {
        errorElement.textContent = 'This creditor already exists!';
        nameInput.classList.add('error');
        nameInput.focus();
        return;
    }

    const creditor = {
        id: Date.now(),
        name: name,
        lastVisitDate: new Date().toISOString().split('T')[0],
        followUpDate: null,
        status: 'pending',
        history: []
    };

    creditors.push(creditor);
    saveToLocalStorage();
    renderAll();
    clearForm();
}

function markPaid(creditorId) {
    const creditor = creditors.find(c => c.id === creditorId);
    creditor.status = 'paid';
    creditor.lastVisitDate = new Date().toISOString().split('T')[0];
    creditor.followUpDate = getNextTuesday();
    
    recordHistory(creditorId, 'PAYMENT RECEIVED', 
        `Marked as paid. Next follow-up: ${formatDate(new Date(creditor.followUpDate))}`);
    
    saveToLocalStorage();
    renderAll();
}

function showCalendar(creditorId) {
    currentCreditorId = creditorId;
    const modal = document.getElementById('calendarModal');
    const dateInput = document.getElementById('modalDatePicker');
    
    dateInput.min = new Date().toISOString().split('T')[0];
    dateInput.value = '';
    modal.style.display = 'flex';
}

function closeCalendar() {
    document.getElementById('calendarModal').style.display = 'none';
    currentCreditorId = null;
}

function saveReschedule() {
    if (!currentCreditorId) return;
    
    const dateInput = document.getElementById('modalDatePicker');
    if (!dateInput.value) {
        alert('Please select a follow-up date');
        return;
    }
    
    const creditor = creditors.find(c => c.id === currentCreditorId);
    
    creditor.status = 'pending';
    creditor.lastVisitDate = new Date().toISOString().split('T')[0];
    creditor.followUpDate = dateInput.value;
    
    recordHistory(currentCreditorId, 'RESCHEDULED', 
        `New follow-up date: ${formatDate(new Date(dateInput.value))}`);
    
    saveToLocalStorage();
    renderAll();
    closeCalendar();
}

function showHistoryPanel(creditorId) {
    currentCreditorId = creditorId;
    const creditor = creditors.find(c => c.id === creditorId);
    const container = document.getElementById('historyContent');
    
    document.getElementById('history-creditor-name').textContent = creditor.name;
    
    container.innerHTML = creditor.history.map(entry => `
        <div class="history-item">
            <div class="history-date">
                ${formatDate(new Date(entry.date))}
                <span class="history-time">
                    ${new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            </div>
            <div class="history-action">
                <span class="history-status ${entry.action.toLowerCase().replace(' ', '-')}">
                    ${entry.action}
                </span>
                <div class="history-details">${entry.details}</div>
                ${entry.amount ? `
                <div class="history-amount">
                    $${entry.amount.toFixed(2)}
                </div>` : ''}
            </div>
        </div>
    `).reverse().join('');

    document.getElementById('historyPanel').classList.add('active');
    document.getElementById('panelOverlay').style.display = 'block';
}

function deleteCreditor() {
    if (!currentCreditorId) return;
    
    if (confirm('Are you sure you want to permanently delete this creditor and all associated history?')) {
        creditors = creditors.filter(c => c.id !== currentCreditorId);
        saveToLocalStorage();
        renderAll();
        closeHistoryPanel();
    }
}

function closeHistoryPanel() {
    currentCreditorId = null;
    document.getElementById('historyPanel').classList.remove('active');
    document.getElementById('panelOverlay').style.display = 'none';
}

function renderTodaysPayees() {
    const today = new Date().toISOString().split('T')[0];
    const container = document.getElementById('today-payees');
    const countElement = document.getElementById('payee-count');
    
    const todaysCreditors = creditors.filter(c => 
        c.followUpDate === today && 
        c.status === 'pending'
    );

    container.innerHTML = todaysCreditors.map(creditor => `
<div class="payee-item">
<div class="payee-name">${creditor.name}</div>
<div class="payee-dates">
    <div class="text-muted small">
        Last visited: ${new Date(creditor.lastVisitDate).toLocaleDateString('en-GB')}
    </div>
    
</div>
</div>
`).join('');

    countElement.textContent = todaysCreditors.length;
}

function renderCreditors() {
    sortCreditors();
    renderFilteredCreditors(creditors);
}

function renderAll() {
    renderCreditors();
    renderTodaysPayees();
}

function saveToLocalStorage() {
    localStorage.setItem('creditors', JSON.stringify(creditors));
}

function clearForm() {
    document.getElementById('name').value = '';
    document.getElementById('searchInput').value = '';
}

// Initialize with sample data if empty
if (creditors.length === 0) {
    creditors = [
        {
            id: 1,
            name: "EXAMPLE CREDITOR",
            lastVisitDate: new Date().toISOString().split('T')[0],
            followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "pending",
            history: []
        }
    ];
    saveToLocalStorage();
}

// Initial render
renderAll();

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.calendar-modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    if (event.target === document.getElementById('panelOverlay')) {
        closeHistoryPanel();
    }
}
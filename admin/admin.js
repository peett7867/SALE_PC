// !!! 1. วาง URL ของ GOOGLE APPS SCRIPT WEB APP ที่คัดลอกมา !!!
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxZV99Vxh8TTrb33lKvAMxDD03yJ9VD4GWNKUrtwA0mhOBjSMRl_W9okTHoLM3U_g1vow/exec'; // <--- URL เดิม

// !!! 2. วางรหัสผ่านเดียวกับที่ตั้งใน Code.gs !!!
const ADMIN_SECRET_KEY = "MySecretPassword1234"; // <--- รหัสผ่านเดียวกับใน GAS

// DOM Elements
const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const secretKeyInput = document.getElementById('secret-key-input');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const loadingEl = document.getElementById('loading');
const tableBody = document.getElementById('admin-table-body');
const logoutButton = document.getElementById('logout-button');

// ตรวจสอบว่าล็อกอินไว้หรือยัง (ใช้ sessionStorage)
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('admin_key') === ADMIN_SECRET_KEY) {
        showAdminPanel();
    } else {
        showLogin();
    }
});

// จัดการการล็อกอิน
loginButton.addEventListener('click', () => {
    const inputKey = secretKeyInput.value;
    if (inputKey === ADMIN_SECRET_KEY) {
        sessionStorage.setItem('admin_key', inputKey);
        showAdminPanel();
    } else {
        loginError.textContent = 'รหัสผ่านไม่ถูกต้อง!';
    }
});

// จัดการการล็อกเอาต์
logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('admin_key');
    showLogin();
});

function showLogin() {
    loginContainer.style.display = 'block';
    adminPanel.style.display = 'none';
    loginError.textContent = '';
    secretKeyInput.value = '';
}

function showAdminPanel() {
    loginContainer.style.display = 'none';
    adminPanel.style.display = 'block';
    fetchAdminData();
}

// ดึงข้อมูลสำหรับแอดมิน
async function fetchAdminData() {
    loadingEl.style.display = 'block';
    tableBody.innerHTML = '';
    
    const adminKey = sessionStorage.getItem('admin_key');
    if (!adminKey) {
        showLogin();
        return;
    }

    try {
        // ส่งรหัสผ่านไปกับ URL parameter
        const response = await fetch(`${GAS_URL}?admin=${adminKey}`);
        if (!response.ok) throw new Error('Network response failed');
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        if (data.transfers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่พบข้อมูล</td></tr>';
        }

        data.transfers.forEach(item => {
            const tr = document.createElement('tr');
            tr.id = `row-${item.rowId}`; // ตั้ง ID ให้แถว
            
            const statusClass = item.status === 'Approved' ? 'status-approved' : 'status-pending';
            const statusText = item.status;

            tr.innerHTML = `
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${new Date(item.timestamp).toLocaleString('th-TH')}</td>
                <td>${new Date(item.transferDate).toLocaleDateString('th-TH')}</td>
                <td>${item.amount.toFixed(2)}</td>
                <td><a href="${item.slipURL}" target="_blank" class="btn btn-sm btn-outline-primary">ดูสลิป</a></td>
                <td>
                    ${item.status !== 'Approved' ? 
                        `<button class="btn btn-sm btn-success btn-approve" data-rowid="${item.rowId}">ยืนยัน</button>` : 
                        ''}
                    <button class="btn btn-sm btn-danger btn-delete" data-rowid="${item.rowId}">ลบ</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error fetching admin data:', error);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">เกิดข้อผิดพลาด: ${error.message}</td></tr>`;
    } finally {
        loadingEl.style.display = 'none';
    }
}

// จัดการการคลิกปุ่มในตาราง
tableBody.addEventListener('click', async (e) => {
    const target = e.target;
    const rowId = target.dataset.rowid;
    if (!rowId) return;

    if (target.classList.contains('btn-approve')) {
        await handleAdminAction('approve_transfer', rowId, target);
    }
    
    if (target.classList.contains('btn-delete')) {
        if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการแถวที่ ${rowId}?`)) {
            await handleAdminAction('delete_transfer', rowId, target);
        }
    }
});

// ฟังก์ชันส่งคำสั่งไปที่ GAS
async function handleAdminAction(action, rowId, button) {
    const adminKey = sessionStorage.getItem('admin_key');
    if (!adminKey) {
        showLogin();
        return;
    }

    button.disabled = true;
    button.textContent = '...';

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                secret: adminKey,
                action: action,
                rowId: parseInt(rowId)
            }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error);
        }

        // อัปเดต UI
        if (action === 'approve_transfer') {
            const row = document.getElementById(`row-${rowId}`);
            row.querySelector('.badge').classList.remove('status-pending');
            row.querySelector('.badge').classList.add('status-approved');
            row.querySelector('.badge').textContent = 'Approved';
            button.remove(); // ลบปุ่มยืนยันออก
        } else if (action === 'delete_transfer') {
            document.getElementById(`row-${rowId}`).remove(); // ลบแถว
        }

    } catch (error) {
        console.error('Admin action failed:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
        button.disabled = false;
        button.textContent = action === 'approve_transfer' ? 'ยืนยัน' : 'ลบ';
    }
}
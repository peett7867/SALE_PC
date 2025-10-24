// !!! 1. วาง URL ของ GOOGLE APPS SCRIPT WEB APP ที่คัดลอกมา !!!
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxZV99Vxh8TTrb33lKvAMxDD03yJ9VD4GWNKUrtwA0mhOBjSMRl_W9okTHoLM3U_g1vow/exec';

// 2. DOM Elements
const totalAmountEl = document.getElementById('total-amount');
const transferListEl = document.getElementById('transfer-list');
const loadingEl = document.getElementById('loading');
const uploadForm = document.getElementById('upload-form');
const submitButton = document.getElementById('submit-button');
const uploadStatusEl = document.getElementById('upload-status');
const transferModal = new bootstrap.Modal(document.getElementById('transferModal'));

// 3. ฟังก์ชันสำหรับดึงข้อมูลการโอนทั้งหมด
async function fetchTransfers() {
    try {
        loadingEl.style.display = 'block';
        transferListEl.innerHTML = ''; // เคลียร์ของเก่า

        const response = await fetch(GAS_URL);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // อัปเดตยอดรวม
        totalAmountEl.textContent = data.totalAmount.toFixed(2);

        // แสดงรายการ
        if (data.transfers.length === 0) {
            transferListEl.innerHTML = '<p class="text-center text-muted">ยังไม่มีรายการโอน</p>';
        } else {
            data.transfers.forEach(item => {
                const date = new Date(item.timestamp).toLocaleString('th-TH');
                const transferDate = new Date(item.transferDate).toLocaleDateString('th-TH', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });

                const itemEl = document.createElement('div');
                itemEl.className = 'list-group-item';
                itemEl.innerHTML = `
                    <div>
                        <strong>วันที่โอน: ${transferDate}</strong> (ยอด ${item.amount.toFixed(2)} บาท)
                        <br>
                        <small class="text-muted">บันทึกเมื่อ: ${date}</small>
                    </div>
                    <a href="${item.slipURL}" target="_blank" class="btn btn-outline-primary btn-sm">
                        ดูสลิป
                    </a>
                `;
                transferListEl.appendChild(itemEl);
            });
        }

    } catch (error) {
        console.error('Error fetching data:', error);
        transferListEl.innerHTML = `<p class="text-center text-danger">เกิดข้อผิดพลาด: ${error.message}</p>`;
    } finally {
        loadingEl.style.display = 'none';
    }
}

// 4. ฟังก์ชันสำหรับแปลงไฟล์เป็น Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// 5. ฟังก์ชันสำหรับจัดการการอัปโหลดสลิป
async function handleUpload(event) {
    event.preventDefault(); // กันหน้าเว็บรีเฟรช

    const file = document.getElementById('slipFile').files[0];
    const transferDate = document.getElementById('transferDate').value;
    const amount = document.getElementById('amount').value;

    if (!file || !transferDate || !amount) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }

    // แสดงสถานะกำลังอัปโหลด
    submitButton.disabled = true;
    submitButton.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        กำลังอัปโหลด...
    `;
    uploadStatusEl.style.display = 'block';
    uploadStatusEl.className = 'alert alert-info';
    uploadStatusEl.textContent = 'กำลังส่งข้อมูล...';

    try {
        const fileData = await fileToBase64(file);
        
        const payload = {
            fileName: file.name,
            fileType: file.type,
            fileData: fileData, // นี่คือ base64 string
            transferDate: transferDate,
            amount: amount
        };

        // ส่งข้อมูลไปที่ Google Apps Script (GAS)
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // GAS มักจะรับ 'text/plain' สำหรับ JSON string
            }
        });

        const result = await response.json();

        if (result.success) {
            uploadStatusEl.className = 'alert alert-success';
            uploadStatusEl.textContent = 'อัปโหลดสำเร็จ!';
            
            // ปิด Modal และรีเฟรชรายการ
            setTimeout(() => {
                uploadForm.reset();
                uploadStatusEl.style.display = 'none';
                transferModal.hide();
                fetchTransfers(); // โหลดข้อมูลใหม่
            }, 1500);

        } else {
            throw new Error(result.error || 'Unknown error');
        }

    } catch (error) {
        console.error('Upload error:', error);
        uploadStatusEl.className = 'alert alert-danger';
        uploadStatusEl.textContent = `เกิดข้อผิดพลาด: ${error.message}`;
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'ยืนยันการโอน';
    }
}

// 6. สั่งให้ฟังก์ชันทำงาน
document.addEventListener('DOMContentLoaded', () => {
    fetchTransfers(); // โหลดข้อมูลเมื่อหน้าเว็บพร้อม
    uploadForm.addEventListener('submit', handleUpload); // เพิ่ม event ให้ฟอร์ม
});
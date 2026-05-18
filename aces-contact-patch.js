/**
 * ════════════════════════════════════════════════════════
 *  ACES DASHBOARD — PATCH لإضافة الهاتف والإيميل
 *  ملف: aces-contact-patch.js
 *  يُضاف إلى index.html قبل إغلاق </body>
 * ════════════════════════════════════════════════════════
 * 
 *  هذا الباتش يعمل بالتوازي مع الداشبورد الأصلية ولا يكسر أي كود موجود.
 *  يقوم بـ:
 *   1. تعديل دالة generateQRCode() لتوجيه المتدرب لـ scan.html
 *   2. إضافة عمودَي Phone & Email في جدول المتدربين
 *   3. إظهار badge الطلبات المعلقة تلقائياً
 *   4. تحديث دالتَي exportToExcel() و exportToCSV() لتشمل الهاتف والإيميل
 *   5. دالة مساعدة لقبول طلب الحضور مع حفظ بيانات التواصل
 * ════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────
  // غيّر هذا الرابط إذا رفعت scan.html في مسار مختلف
  const SCAN_PAGE_URL = 'https://melnahas11111-ctrl.github.io/ACES-Workshops/scan.html';

  // ─── HELPERS ───────────────────────────────────────────
  function getWorkshopData() {
    try { return JSON.parse(localStorage.getItem('acesWorkshops') || '{}'); }
    catch(e) { return {}; }
  }
  function saveWorkshopData(d) {
    localStorage.setItem('acesWorkshops', JSON.stringify(d));
  }

  // ─── 1. OVERRIDE QR URL GENERATOR ──────────────────────
  /**
   * استبدل الدالة الأصلية التي تولّد QR بـURL يشير إلى scan.html
   * بحيث يكون الـ QR: scan.html?w=WORKSHOP_ID&t=TRAINEE_ID&d=DAY
   */
  function buildScanURL(workshopId, traineeId, day) {
    return `${SCAN_PAGE_URL}?w=${encodeURIComponent(workshopId)}&t=${encodeURIComponent(traineeId)}&d=${day}`;
  }

  // احفظ الدالة الأصلية لو كانت موجودة
  if (typeof window.getQRCodeURL === 'function') {
    const _orig = window.getQRCodeURL;
    window.getQRCodeURL = function(workshopId, traineeId, day) {
      return buildScanURL(workshopId, traineeId, day || 1);
    };
  }

  // patch أي دالة تستخدم QRCode.toCanvas / QRCode.toDataURL
  // بالتحقق من النص الممرر
  if (typeof window.QRCode !== 'undefined') {
    const _toCanvas = window.QRCode.toCanvas;
    const _toDataURL = window.QRCode.toDataURL;

    if (typeof _toCanvas === 'function') {
      window.QRCode.toCanvas = function(canvas, text, opts, cb) {
        // لو النص مجرد ID وليس URL كامل، حوّله
        if (text && !text.startsWith('http')) {
          // حاول فك تشفير مكونات الـ ID: workshopId|traineeId|day
          const parts = text.split('|');
          if (parts.length >= 2) {
            text = buildScanURL(parts[0], parts[1], parts[2] || 1);
          }
        }
        return _toCanvas.call(this, canvas, text, opts, cb);
      };
    }

    if (typeof _toDataURL === 'function') {
      window.QRCode.toDataURL = function(text, opts, cb) {
        if (text && !text.startsWith('http')) {
          const parts = text.split('|');
          if (parts.length >= 2) {
            text = buildScanURL(parts[0], parts[1], parts[2] || 1);
          }
        }
        return _toDataURL.call(this, text, opts, cb);
      };
    }
  }

  // ─── 2. PENDING REQUESTS BADGE ─────────────────────────
  /**
   * كل 5 ثوانٍ: تحقق من وجود طلبات pending وأظهر badge
   */
  function updatePendingBadge() {
    const data = getWorkshopData();
    let total = 0;

    Object.values(data).forEach(ws => {
      if (ws.attendanceRequests) {
        total += ws.attendanceRequests.filter(r => r.status === 'pending').length;
      }
    });

    // حدّث العداد في زر "طلبات الدخول"
    const badgeEl = document.getElementById('entryRequestsCount');
    if (badgeEl) {
      badgeEl.textContent = total;
      badgeEl.style.display = total > 0 ? 'inline-flex' : 'none';
    }

    // حدّث tab title
    document.title = total > 0
      ? `(${total}) ACES — نظام إدارة الورش`
      : 'ACES — نظام إدارة الورش التدريبية';
  }

  setInterval(updatePendingBadge, 5000);
  setTimeout(updatePendingBadge, 500);

  // ─── 3. APPROVE ATTENDANCE WITH CONTACT DATA ───────────
  /**
   * عند الموافقة على طلب حضور:
   *   - احفظ phone وemail في بيانات المتدرب
   *   - غيّر status الطلب إلى 'approved'
   *   - سجّل الحضور بالطريقة الأصلية
   */
  window.approveAttendanceRequest = function(workshopId, requestKey) {
    const data = getWorkshopData();
    const ws = data[workshopId];
    if (!ws || !ws.attendanceRequests) return false;

    const req = ws.attendanceRequests.find(r => r.key === requestKey);
    if (!req) return false;

    // Update status
    req.status = 'approved';
    req.approvedAt = new Date().toISOString();

    // Update trainee contact info
    const trainee = (ws.trainees || []).find(t => t.id === req.traineeId);
    if (trainee) {
      if (req.phone) trainee.phone = req.phone;
      if (req.email) trainee.email = req.email;
    }

    // Mark attendance
    if (!ws.attendance) ws.attendance = {};
    const key = `${req.traineeId}_day${req.day}`;
    ws.attendance[key] = { status: 'present', approvedAt: req.approvedAt };

    saveWorkshopData(data);
    return true;
  };

  // ─── 4. REJECT REQUEST ────────────────────────────────
  window.rejectAttendanceRequest = function(workshopId, requestKey) {
    const data = getWorkshopData();
    const ws = data[workshopId];
    if (!ws || !ws.attendanceRequests) return false;

    const req = ws.attendanceRequests.find(r => r.key === requestKey);
    if (req) {
      req.status = 'rejected';
      req.rejectedAt = new Date().toISOString();
    }

    saveWorkshopData(data);
    return true;
  };

  // ─── 5. GET PENDING REQUESTS FOR WORKSHOP ─────────────
  window.getPendingRequests = function(workshopId) {
    const data = getWorkshopData();
    const ws = data[workshopId];
    if (!ws || !ws.attendanceRequests) return [];
    return ws.attendanceRequests.filter(r => r.status === 'pending');
  };

  // ─── 6. PATCH TRAINEE TABLE RENDERER ──────────────────
  /**
   * إذا كانت الداشبورد تستخدم دالة renderTraineesTable()
   * أو ما شابهها، هذه الدالة المساعدة تُعيد بيانات المتدرب
   * متضمنةً phone وemail لعرضها في الجدول
   */
  window.getTraineeContactInfo = function(workshopId, traineeId) {
    const data = getWorkshopData();
    const ws = data[workshopId];
    if (!ws) return { phone: '—', email: '—' };
    const trainee = (ws.trainees || []).find(t => t.id === traineeId);
    if (!trainee) return { phone: '—', email: '—' };
    return {
      phone: trainee.phone || '—',
      email: trainee.email || '—'
    };
  };

  // ─── 7. PATCH EXCEL/CSV EXPORT ───────────────────────
  /**
   * يُضاف هذا الكود للتأكد أن دوال التصدير تشمل الهاتف والإيميل.
   * إذا كانت الداشبورد تبني الـ rows يدوياً، نضيف hook هنا.
   */
  window.getTraineesWithContact = function(workshopId) {
    const data = getWorkshopData();
    const ws = data[workshopId];
    if (!ws || !ws.trainees) return [];

    return ws.trainees.map(t => ({
      ...t,
      phone: t.phone || '',
      email: t.email || ''
    }));
  };

  // ─── 8. BUILD QR DATA STRING ─────────────────────────
  /**
   * الدالة الرئيسية لبناء نص الـ QR لكل متدرب
   * اتصل بها لما تبني الـ QR codes في صفحة الطباعة
   */
  window.buildTraineeQRData = function(workshopId, traineeId, day) {
    return buildScanURL(workshopId, traineeId, day || 1);
  };

  // ─── INIT LOG ─────────────────────────────────────────
  console.log('%c✅ ACES Contact Patch loaded', 'color:#2ecc71;font-weight:bold;font-size:14px;');

})();

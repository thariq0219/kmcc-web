import { supabase } from './supabase.js';

// Helper: Show snackbar notification
function showSnackbar(message) {
    const snackbar = document.createElement('div');
    snackbar.textContent = message;
    snackbar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:4px;z-index:9999;';
    document.body.appendChild(snackbar);
    setTimeout(() => snackbar.remove(), 3000);
}

// Helper: Ensure medical info is displayed
function safeGet(id) { return document.getElementById(id); }

function ensureMedicalInfo(memberData) {
    const el = safeGet('medicalInfo');
    if (!el) return;
    const v = memberData.medical;
    const isMed = v === true || v === 'true' || v === 1 || v === '1' ||
        (typeof v === 'string' && ['yes', 'y'].includes(v.toLowerCase()));
    if (!isMed) { el.textContent = ''; el.style.display = 'none'; return; }
    el.innerHTML = `
    <div style="font-weight:700;color:#d32f2f;font-size:14px;">Medical : YES</div>
    <div style="font-weight:700;color:#d32f2f;font-size:12px;">Med-Valid till: DEC 2025</div>
  `;
    el.style.display = 'block';
}

// Helper: Create high-resolution clone for download
function createHighResClone(cardElement) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';

    const clone = cardElement.cloneNode(true);

    const targetWidth = 1667;
    const targetHeight = 834;

    clone.style.width = `${targetWidth}px`;
    clone.style.height = `${targetHeight}px`;
    clone.style.boxSizing = 'border-box';
    clone.style.transform = 'none';

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // Ensure medical info in clone
    const memberData = JSON.parse(localStorage.getItem('memberData'));
    if (memberData) {
        const cloneMedicalInfo = clone.querySelector('#medicalInfo');
        if (cloneMedicalInfo) {
            const medicalValue = memberData.medical;
            const isMedical = medicalValue === true ||
                medicalValue === 'true' ||
                medicalValue === 1 ||
                medicalValue === '1' ||
                (typeof medicalValue === 'string' &&
                    ['yes', 'y'].includes(medicalValue.toLowerCase()));

            if (isMedical) {
                cloneMedicalInfo.innerHTML = `
                    <div style="font-weight: bold; color: #d32f2f; font-size: 22px; margin-top: 12px;">Medical : YES</div>
                    <div style="font-weight: bold; color: #d32f2f; font-size: 20px; margin-top: 4px;">Med-Valid till: DEC 2025</div>
                `;
                cloneMedicalInfo.style.display = 'block';
            }
        }
    }

    return { wrapper, clone, targetWidth, targetHeight };
}

function waitForCloneImages(clone, timeoutMs = 3000) {
    const imgs = Array.from(clone.querySelectorAll('img')).filter(Boolean);
    if (imgs.length === 0) return Promise.resolve();

    return Promise.all(imgs.map(img => {
        return new Promise(resolve => {
            // Already loaded
            if (img.complete && img.naturalWidth > 0) return resolve();
            // Attach safely
            const onDone = () => resolve();
            try {
                img.onload = onDone;
                img.onerror = onDone;
            } catch {
                // If img is null or readonly, just resolve
                resolve();
            }
            setTimeout(onDone, timeoutMs);
        });
    }));
}

function triggerDownload(href, fileName) {
    const a = document.createElement('a');
    a.rel = 'noopener';
    a.download = fileName;
    a.href = href;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 100);
}

async function generateAndDownloadCard() {
    const memberDataRaw = localStorage.getItem('memberData');
    if (!memberDataRaw) {
        alert('Member data not found.');
        window.location.href = 'index.html';
        return;
    }
    const memberData = JSON.parse(memberDataRaw);

    const cardElement = document.getElementById('card');
    if (!cardElement) {
        alert('Card element (#card) not found.');
        return;
    }

    ensureMedicalInfo(memberData);

    const { wrapper, clone, targetWidth = 1667, targetHeight = 834 } = createHighResClone(cardElement);

    // Ensure images load without throwing if any are missing
    await waitForCloneImages(clone, 3500);

    try {
        const canvas = await html2canvas(clone, {
            scale: 1,
            useCORS: true,
            backgroundColor: '#ffffff',
            imageTimeout: 0,
            logging: false,
            windowWidth: targetWidth,
            windowHeight: targetHeight
        });

        const fileName = `KMCC_ID_Card_${memberData.civil_id || memberData.name || 'member'}.png`;

        // Prefer Blob for better reliability
        if (canvas.toBlob) {
            canvas.toBlob(blob => {
                if (!blob) {
                    const dataURL = canvas.toDataURL('image/png');
                    triggerDownload(dataURL, fileName);
                    return;
                }
                const url = URL.createObjectURL(blob);
                triggerDownload(url, fileName);
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            }, 'image/png', 1.0);
        } else {
            const dataURL = canvas.toDataURL('image/png');
            triggerDownload(dataURL, fileName);
        }

        showSnackbar('Card downloaded successfully');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (e) {
        console.error('Download failed:', e);
        alert('Failed to generate card: ' + e.message);
    } finally {
        wrapper.remove();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const raw = localStorage.getItem('memberData');
    if (raw) {
        try {
            const data = JSON.parse(raw);
            const photo = safeGet('photo');
            if (photo && data.photo_url) photo.src = data.photo_url;
            ensureMedicalInfo(data);
        } catch { }
    }
    const params = new URLSearchParams(location.search);
    if (params.get('download') === 'true') {
        setTimeout(generateAndDownloadCard, 800);
    }

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            generateAndDownloadCard();
        });
    });
});

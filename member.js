import { supabase } from './supabase.js';

// ---------------- State ----------------
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');            // 'new' or undefined
const civilIdFromUrl = urlParams.get('civilId');
let districts = [];
let areas = [];
let selectedPhotoFile = null;
// Keep photo URL only in memory/localStorage, not in the form
let currentPhotoUrl = null;
let memberCreatedAt = null; // ISO string when available
let formReadOnly = false; // track read-only state to avoid re-enabling controls

// Eligibility helpers for medical scheme
function isNewMember(createdAtIso) {
    if (!createdAtIso) return false;
    const created = new Date(createdAtIso).getTime();
    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    return (now - created) < oneYearMs;
}

function formatRemaining(createdAtIso) {
    if (!createdAtIso) return '';
    const created = new Date(createdAtIso).getTime();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const target = new Date(created + oneYearMs);
    const remainingMs = Math.max(0, (created + oneYearMs) - Date.now());
    const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return `Medical available after ${target.toLocaleDateString()} (${days} days)`;
}


// ---------------- Helpers ----------------
function setField(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!value;
    else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') el.value = value ?? '';
}



function populateExistingMemberData(data) {
    if (!data) return;
    const map = {
        memberId: data.id,
        name: data.name,
        fatherName: data.father_name,
        familyName: data.family_name,
        civilId: data.civil_id,
        dob: (data.dob || '').split('T')[0] || data.dob,
        district: data.district_id,
        area: data.area_id,
        mobileNumber: data.mobile_number || data.mobile,
        bloodGroup: data.blood_group,
        gender: data.gender,
        medical: data.medical,
        localAddress: data.local_address,
        permanentAddress: data.permanent_address,
        pincode: data.pincode,
        lastUpdate: data.updated_at,
        nomineeName: data.nominee_name,
        nomineeRelationship: data.nominee_relation,
        nomineeContact: data.nominee_contact
    };
    Object.entries(map).forEach(([k, v]) => setField(k, v));
    currentPhotoUrl = data.photo_url || null;
    const avatar = document.getElementById('avatar');
    if (avatar && currentPhotoUrl) avatar.src = currentPhotoUrl;

    // Capture created_at if included in the view
    if (data.created_at) {
        memberCreatedAt = data.created_at;
    }

    const status = (data.status || '').toLowerCase();
    if (['a', 'approved'].includes(status)) {
        const btn = document.getElementById('downloadBtn');
        if (btn) {
            btn.classList.remove('hidden');
            btn.onclick = async (e) => {
                e.preventDefault();
                try {
                    await generateAndDownloadCardDirect();
                } catch (err) {
                    console.error('Direct download failed:', err);
                    alert('Could not download ID card.');
                }
            };
        }
        // make form read-only when approved
        setReadOnlyState(true);
    } else {
        // ensure editable when not approved
        setReadOnlyState(false);
    }

    // Show nominee section if medical is checked
    if (data.medical) {
        const nomineeSection = document.getElementById('nomineeSection');
        if (nomineeSection) nomineeSection.classList.remove('hidden');
    }

    // Configure medical eligibility UI with current state
    configureMedicalEligibilityUI(!!data.medical);
}

function populateSelect(list, id, selected) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">Select</option>';
    list.forEach(it => {
        const opt = document.createElement('option');
        opt.value = it.id;
        opt.textContent = it.name;
        if (selected && it.id === selected) opt.selected = true;
        sel.appendChild(opt);
    });
}

async function fetchDistricts(selected) {
    const { data, error } = await supabase.from('district').select('id,name').order('name');
    if (!error && data) districts = data;
    populateSelect(districts, 'district', selected);
}

async function fetchAreas(selected) {
    const { data, error } = await supabase.from('area').select('id,name').order('name');
    if (!error && data) areas = data;
    populateSelect(areas, 'area', selected);
}

async function compressImage(file, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = e => {
            const img = new Image();
            img.onload = () => {
                const max = 1024;
                let { width, height } = img;
                if (width > max || height > max) {
                    if (width > height) { height = height * (max / width); width = max; }
                    else { width = width * (max / height); height = max; }
                }
                const c = document.createElement('canvas');
                c.width = width; c.height = height;
                c.getContext('2d').drawImage(img, 0, 0, width, height);
                c.toBlob(b => b ? resolve(b) : reject(), 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

// ---------------- Direct ID Card Download (Offscreen) ----------------
function showSnackbar(message) {
    const bar = document.getElementById('snackbar');
    if (!bar) return;
    bar.textContent = message;
    bar.classList.add('show');
    setTimeout(() => bar.classList.remove('show'), 2500);
}

function buildCardElement(memberData) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '410px';
    wrapper.style.padding = '8px';
    wrapper.style.background = '#fff';
    wrapper.style.zIndex = '0';

    const card = document.createElement('div');
    card.style.position = 'relative';
    card.style.width = '400px';
    card.style.height = '210px';
    card.style.borderRadius = '14px';
    card.style.overflow = 'hidden';
    card.style.border = '1px solid #0a7700';

    card.style.margin = '16px'; // ✅ Space outside the border
    card.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';


    const bg = document.createElement('img');
    bg.src = 'Logo-bg (1).png';
    bg.style.position = 'absolute';
    bg.style.inset = '0';
    bg.style.width = '100%';
    bg.style.height = '100%';
    bg.style.objectFit = 'cover';
    bg.style.zIndex = '1';
    bg.crossOrigin = 'anonymous';

    const content = document.createElement('div');
    content.style.position = 'relative';
    content.style.zIndex = '5';
    content.style.height = '100%';
    content.style.padding = '0px 14px 0px';
    content.style.fontFamily = 'Poppins, sans-serif';
    content.style.color = '#000';


    const header = document.createElement('div');
    header.style.color = '#fff';
    header.style.fontWeight = '800';
    header.style.fontSize = '14px';
    header.style.lineHeight = '1.2'; // Removes default margin
    header.style.marginBottom = '24px';
    header.innerHTML = 'SALALAH - KMCC<br><span style="font-weight:600;font-size:12px;">Membership Card 2026-27</span><br/>';


    function row(label, value, bold = false, isFirst = false) {
        const r = document.createElement('div');
        r.style.display = 'flex';
        r.style.alignItems = 'center';
        r.style.fontSize = '13px';
        r.style.margin = isFirst ? '32px 0 16px 0' : '16px 0'; // More space on top if first
        r.style.lineHeight = '0.6';

        const s1 = document.createElement('strong');
        s1.style.minWidth = '90px';
        s1.textContent = label;
        if (bold) s1.style.fontWeight = '900';


        const colon = document.createElement('Strong');
        colon.textContent = ':  ';
        colon.style.marginLeft = '4px';

        const s2 = document.createElement('span');
        s2.style.marginLeft = '8px';
        s2.textContent = value || '';
        r.appendChild(s1); r.appendChild(colon); r.appendChild(s2);
        return r;
    }

    content.appendChild(header);
    content.appendChild(row('KMCC NO.', memberData.id.toString().toUpperCase(), true));
    content.appendChild(row('NAME', memberData.name.toUpperCase()));
    content.appendChild(row('AREA', memberData.area_name.toUpperCase()));
    content.appendChild(row('MOBILE', (memberData.mobile_number || memberData.mobile).toUpperCase()));
    content.appendChild(row('DISTRICT', memberData.district_name.toUpperCase()));
    content.appendChild(row('BLOOD', memberData.blood_group.toUpperCase()));
    const photoBox = document.createElement('div');
    photoBox.style.position = 'absolute';
    photoBox.style.right = '8px';
    photoBox.style.bottom = '16px';

    const photo = document.createElement('img');
    photo.style.width = '70px';
    photo.style.height = '70px';

    photo.style.borderRadius = '6px';
    photo.style.border = '2px solid #eee';
    photo.style.objectFit = 'cover';
    photo.crossOrigin = 'anonymous';
    photo.src = memberData.photo_url || 'https://img.freepik.com/premium-vector/muslim-man-avatar-giving-thumbs-up-illustration_591903-650.jpg';

    const medical = document.createElement('div');
    medical.style.marginTop = '4px';
    medical.style.fontSize = '10px';
    medical.style.fontWeight = '700';
    medical.style.color = '#a5321eff';
    if (memberData.medical) {
        medical.innerHTML = 'Medical: YES<br>Valid till: Dec 2026';
    }

    photoBox.appendChild(photo);
    photoBox.appendChild(medical);
    content.appendChild(photoBox);

    card.appendChild(bg);
    card.appendChild(content);
    wrapper.appendChild(card);
    document.body.appendChild(wrapper);

    return { wrapper, card, photo, bg };
}

async function generateAndDownloadCardDirect() {
    // Ensure we have member data
    const stored = localStorage.getItem('memberData');
    if (!stored) throw new Error('No member data');
    const memberData = JSON.parse(stored);

    const { wrapper, card, photo, bg } = buildCardElement(memberData);

    // Wait for images to be ready
    await Promise.all([
        new Promise(res => { if (photo.complete) res(); else { photo.onload = res; photo.onerror = res; } }),
        new Promise(res => { if (bg.complete) res(); else { bg.onload = res; bg.onerror = res; } })
    ]);

    // Two RAFs to ensure layout
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // Render and download
    const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false
    });

    const link = document.createElement('a');
    link.download = `KMCC_ID_${memberData.id}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Cleanup
    wrapper.remove();

    // Snackbar and redirect
    showSnackbar('Downloaded successfully');
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
}

async function saveMember() {
    const requiredIds = ['civilId', 'dob', 'name', 'fatherName', 'familyName', 'district', 'area', 'mobileNumber', 'bloodGroup', 'gender', 'localAddress', 'permanentAddress', 'pincode'];
    for (const id of requiredIds) {
        const el = document.getElementById(id);
        if (!el || !el.value) { alert('Please fill all required fields.'); return; }
    }

    // Check if photo is required
    if (!selectedPhotoFile && !currentPhotoUrl) {
        alert('Profile photo is required. Please upload a photo.');
        return;
    }

    // Check medical checkbox and validate nominee fields if checked
    const medicalEl = document.getElementById('medical');
    const medicalChecked = !!medicalEl?.checked;
    // Block saving medical=true when ineligible (mode=new or within 1 year)
    const ineligible = (mode === 'new') || isNewMember(memberCreatedAt);
    if (medicalChecked && ineligible && !medicalEl.disabled) {
        alert('Medical scheme is available only after 1 year from membership creation.');
        return;
    }
    if (medicalChecked) {
        const nomineeIds = ['nomineeName', 'nomineeContact', 'nomineeRelationship'];
        for (const id of nomineeIds) {
            const el = document.getElementById(id);
            if (!el || !el.value) {
                alert('Please fill all nominee details for medical insurance.');
                return;
            }
        }
    }

    const formData = {
        civil_id: civilIdFromUrl || document.getElementById('civilId').value,
        dob: document.getElementById('dob').value,
        name: document.getElementById('name').value,
        father_name: document.getElementById('fatherName')?.value || null,
        family_name: document.getElementById('familyName')?.value || null,
        district_id: parseInt(document.getElementById('district').value) || null,
        area_id: parseInt(document.getElementById('area').value) || null,
        mobile_number: document.getElementById('mobileNumber').value,
        blood_group: document.getElementById('bloodGroup')?.value || null,
        gender: document.getElementById('gender')?.value || null,
        medical: medicalChecked,
        local_address: document.getElementById('localAddress')?.value || null,
        permanent_address: document.getElementById('permanentAddress')?.value || null,
        pincode: document.getElementById('pincode')?.value || null,
        status: 'P', // pending on save
        last_update: new Date().toISOString(),
        nominee_name: document.getElementById('nomineeName')?.value || null,
        nominee_relation: document.getElementById('nomineeRelationship')?.value || null,
        nominee_contact: document.getElementById('nomineeContact')?.value || null
    };

    if (selectedPhotoFile) {
        try {
            const blob = await compressImage(selectedPhotoFile);
            const fileName = `member_${formData.civil_id}.jpg`;
            const { error } = await supabase.storage.from('profile').upload(fileName, blob, { upsert: true });
            if (!error) {
                const { data } = supabase.storage.from('profile').getPublicUrl(fileName);
                currentPhotoUrl = data?.publicUrl || null;
            }
        } catch { alert('Photo upload failed.'); }
    }
    formData.photo_url = currentPhotoUrl || null;

    try {
        let db;
        if (mode === 'new') {
            db = await supabase.from('membership').insert([formData]).select('*').single();
        } else {
            db = await supabase.from('membership').update(formData)
                .eq('civil_id', formData.civil_id).eq('dob', formData.dob).select('*').single();
        }
        if (db.error) throw db.error;

        // Always fetch the latest data from the view to ensure consistency
        const { data: updatedData, error: viewError } = await supabase.from('member_with_area_district1')
            .select('*').eq('civil_id', formData.civil_id).eq('dob', formData.dob).maybeSingle();

        if (viewError) throw viewError;

        // Merge view row with base row to preserve fields like pincode
        const merged = { ...(updatedData || {}), ...(db.data || {}), pincode: formData.pincode };
        localStorage.setItem('memberData', JSON.stringify(merged));
        alert(mode === 'new' ? 'Submitted. Await approval.' : 'Updated. Await approval.');
        window.location.href = 'index.html';
    } catch (e) {
        alert('Save error.');
        console.error(e);
    }
}

// Add this helper to toggle readonly state for form fields
function setReadOnlyState(readonly) {
    const form = document.getElementById('edit-form');
    if (!form) return;
    formReadOnly = !!readonly;
    // Disable/enable inputs, selects, textareas
    form.querySelectorAll('input, select, textarea, button').forEach(el => {
        // keep Back buttons (type=button) usable by checking data-preserve attribute
        if (el.dataset && el.dataset.preserve === 'true') return;
        // Always keep Civil ID disabled
        if (el.id === 'civilId') return;
        // Do not disable non-form navigation buttons that should remain active (e.g. downloadBtn outside form)
        el.disabled = !!readonly;
    });

    // Photo input and avatar
    const photoInput = document.getElementById('photoInput');
    if (photoInput) photoInput.disabled = !!readonly;
    const avatar = document.getElementById('avatar');
    if (avatar) avatar.style.pointerEvents = readonly ? 'none' : '';

    // Save button visibility
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.style.display = readonly ? 'none' : '';

    // Also disable medical modal controls which are outside the form
    const medicalAgree = document.getElementById('medicalAgree');
    const medicalAcceptBtn = document.getElementById('medicalAcceptBtn');
    const medicalCancelBtn = document.getElementById('medicalCancelBtn');
    if (medicalAgree) medicalAgree.disabled = !!readonly;
    if (medicalAcceptBtn) medicalAcceptBtn.disabled = !!readonly;
    if (medicalCancelBtn) medicalCancelBtn.disabled = !!readonly;
}

// Configure medical checkbox visibility and messaging based on eligibility
function configureMedicalEligibilityUI(existingMedicalChecked) {
    const medical = document.getElementById('medical');
    const info = document.getElementById('medicalInfo');
    const nomineeSection = document.getElementById('nomineeSection');
    if (!medical) return;

    const ineligible = formReadOnly || (mode === 'new') || isNewMember(memberCreatedAt);

    if (ineligible) {
        medical.disabled = true;
        // If not already enrolled, keep unchecked and hide nominee
        if (!existingMedicalChecked) {
            medical.checked = false;
            if (nomineeSection) nomineeSection.classList.add('hidden');
        }
        if (info) {
            info.classList.remove('hidden');
            info.textContent = mode === 'new'
                ? 'അംഗത്വത്തിൽ നിന്ന് ഒരു വർഷത്തിനുശേഷം മെഡിക്കൽ യോഗ്യത നേടാം.'
                : formatRemaining(memberCreatedAt);
        }
    } else {
        medical.disabled = false;
        if (info) info.classList.add('hidden');
    }
}

// Setup real-time subscription for status changes
function setupRealtimeSubscription(civilId, dob) {
    if (!civilId || !dob) return;

    const subscription = supabase
        .channel('membership-changes')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'membership',
                filter: `civil_id=eq.${civilId}`
            },
            async (payload) => {
                console.log('Status change detected:', payload);
                const newStatus = (payload.new.status || '').toLowerCase();

                // Re-fetch complete data from view
                const { data: updatedData } = await supabase
                    .from('member_with_area_district1')
                    .select('*')
                    .eq('civil_id', civilId)
                    .eq('dob', dob)
                    .maybeSingle();

                if (updatedData) {
                    localStorage.setItem('memberData', JSON.stringify(updatedData));

                    if (['a', 'approved'].includes(newStatus)) {
                        alert('Your membership has been approved!');
                        // Refresh the page to show download button
                        window.location.reload();
                    } else if (['r', 'rejected'].includes(newStatus)) {
                        alert('Your membership status has been updated to rejected.');
                        window.location.reload();
                    }
                }
            }
        )
        .subscribe();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        subscription.unsubscribe();
    });
}

// ---------------- Initialization ----------------
async function initializePage() {
    await Promise.all([fetchDistricts(), fetchAreas()]);

    // Civil ID is always non-editable for both new and existing forms
    const civilIdInput = document.getElementById('civilId');
    if (civilIdInput) {
        civilIdInput.disabled = true;
    }

    if (mode === 'new') {
        const t = document.querySelector('h2'); if (t) t.textContent = 'New Member Registration';
        setField('civilId', civilIdFromUrl || '');
        // new member must be editable
        setReadOnlyState(false);
        // Block medical for new member creation
        memberCreatedAt = null;
        configureMedicalEligibilityUI(false);
    } else {
        const stored = localStorage.getItem('memberData');
        if (stored) {
            const memberData = JSON.parse(stored);
            populateExistingMemberData(memberData);
            // Setup realtime subscription for status updates
            setupRealtimeSubscription(memberData.civil_id, memberData.dob);
            // Fetch created_at from base table if not present in view
            if (!memberCreatedAt && memberData?.civil_id && memberData?.dob) {
                try {
                    const { data: baseRow } = await supabase
                        .from('membership')
                        .select('created_at, medical')
                        .eq('civil_id', memberData.civil_id)
                        .eq('dob', memberData.dob)
                        .maybeSingle();
                    if (baseRow) {
                        memberCreatedAt = baseRow.created_at || null;
                        configureMedicalEligibilityUI(!!(baseRow.medical || memberData.medical));
                    }
                } catch (e) {
                    console.warn('Could not fetch created_at:', e);
                }
            }
        }
    }
}

// ---------------- Events ----------------
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    document.getElementById('saveBtn')?.addEventListener('click', saveMember);
    const avatar = document.getElementById('avatar');
    const photoInput = document.getElementById('photoInput');
    if (avatar && photoInput) {
        avatar.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', e => {
            const f = e.target.files?.[0]; if (!f) return;
            selectedPhotoFile = f;
            const r = new FileReader();
            r.onload = ev => { avatar.src = ev.target.result; };
            r.readAsDataURL(f);
        });
    }
    const medical = document.getElementById('medical');
    const modal = document.getElementById('medicalModal');
    const agree = document.getElementById('medicalAgree');
    const acceptBtn = document.getElementById('medicalAcceptBtn');
    const cancelBtn = document.getElementById('medicalCancelBtn');
    const nomineeSection = document.getElementById('nomineeSection');
    function toggleNominee(show) {
        if (!nomineeSection) return;
        nomineeSection.classList.toggle('hidden', !show);
    }
    if (medical && modal) {
        medical.addEventListener('change', () => {
            // Prevent opening modal when ineligible
            if (medical.disabled) {
                const info = document.getElementById('medicalInfo');
                if (info) {
                    info.classList.remove('hidden');
                    info.textContent = mode === 'new'
                        ? 'Medical scheme can be enabled after approval and 1 year.'
                        : formatRemaining(memberCreatedAt);
                }
                // Revert any attempted toggle
                medical.checked = !!(medical.checked && !medical.disabled);
                return;
            }
            if (medical.checked) {
                if (agree) agree.checked = false;
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            } else {
                toggleNominee(false);
            }
        });

        acceptBtn?.addEventListener('click', () => {
            if (!agree?.checked) { alert('Please agree first.'); return; }
            toggleNominee(true);
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });

        cancelBtn?.addEventListener('click', () => {
            medical.checked = false;
            toggleNominee(false);
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });
    }
});
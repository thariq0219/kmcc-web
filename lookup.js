import { supabase } from './supabase.js';

const acceptedAt = parseInt(localStorage.getItem('termsAcceptedAt') || '0');
const now = Date.now();
const oneHour = 60 * 60 * 1000;

if (acceptedAt && (now - acceptedAt < oneHour)) {
  modal.classList.add('hidden');
  mainContent.classList.remove('hidden');
} else {
  modal.classList.remove('hidden');
  mainContent.classList.add('hidden');
}

document.getElementById('accept-btn').onclick = () => {
  document.getElementById('terms-modal').classList.add('hidden');
  document.getElementById('lookup-section').classList.remove('hidden');
};

document.getElementById('decline-btn').onclick = () => {
  alert('You must accept the terms to proceed.');
};

document.getElementById('lookup-form').onsubmit = async (e) => {
  e.preventDefault();
  const civilId = document.getElementById('civilId').value;
  const dob = document.getElementById('dob').value;

  const { data, error } = await supabase
    .from('member_with_area_district1')
    .select('*')
    .eq('civil_id', civilId)
    .eq('dob', dob)
    .single();
  

  if (error || !data) {
    alert('No matching member found.');
  } else {
    localStorage.setItem('memberData', JSON.stringify(data));
    window.location.href = 'member.html';
  }
};


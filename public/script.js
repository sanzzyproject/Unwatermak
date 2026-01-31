const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const loadingState = document.getElementById('loadingState');
const resultArea = document.getElementById('resultArea');
const imgOriginal = document.getElementById('imgOriginal');
const imgResult = document.getElementById('imgResult');
const downloadBtn = document.getElementById('downloadBtn');

// Trigger file input click
dropZone.addEventListener('click', () => fileInput.click());

// Drag & Drop effects
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary)';
});
dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border)';
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border)';
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// File input change
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

async function handleFile(file) {
    // Validasi
    if (!file.type.startsWith('image/')) {
        alert('Mohon upload file gambar.');
        return;
    }

    // UI Updates
    dropZone.classList.add('hidden');
    loadingState.classList.remove('hidden');

    // Preview Original (Local)
    const reader = new FileReader();
    reader.onload = (e) => {
        imgOriginal.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Prepare Upload
    const formData = new FormData();
    formData.append('image', file);

    try {
        // Call Backend
        const response = await fetch('/api', { // Mengarah ke folder api/index.js
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            loadingState.classList.add('hidden');
            resultArea.classList.remove('hidden');
            
            // Set Result
            imgResult.src = data.output_url;
            downloadBtn.href = data.output_url;
        } else {
            throw new Error(data.error || 'Gagal memproses gambar');
        }

    } catch (error) {
        console.error(error);
        alert('Terjadi kesalahan: ' + error.message);
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Alterna entre a tela de boas-vindas e a de upload
    const welcomeSection = document.getElementById('welcome-section');
    const uploadSection = document.getElementById('upload-section');
    const compartilharBtn = document.getElementById('compartilharBtn');
  
    compartilharBtn.addEventListener('click', function() {
      welcomeSection.style.display = 'none';
      uploadSection.style.display = 'block';
    });
  
    // Elementos do formulário de upload
    const uploadForm = document.getElementById('uploadForm');
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const uploadBtn = document.getElementById('uploadBtn');
    let selectedFiles = [];
  
    function validateForm() {
      const name = document.getElementById('name').value.trim();
      const whatsapp = document.getElementById('whatsapp').value.trim();
      const email = document.getElementById('email').value.trim();
      const authorize = document.getElementById('authorize').checked;
      if (name && whatsapp && email && authorize) {
        selectFilesBtn.disabled = false;
      } else {
        selectFilesBtn.disabled = true;
      }
    }
    uploadForm.addEventListener('input', validateForm);
  
    selectFilesBtn.addEventListener('click', function() {
      fileInput.click();
    });
  
    fileInput.addEventListener('change', function(e) {
      selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > 0) {
        displaySelectedFiles();
        uploadBtn.disabled = false;
      } else {
        filePreview.innerHTML = '';
        uploadBtn.disabled = true;
      }
    });
  
    function displaySelectedFiles() {
      filePreview.innerHTML = '';
      selectedFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.classList.add('file-item');
        div.textContent = `${index + 1}. ${file.name}`;
        filePreview.appendChild(div);
      });
    }
  
    uploadBtn.addEventListener('click', function() {
      const formData = new FormData(uploadForm);
      const name = document.getElementById('name').value.trim();
      const whatsapp = document.getElementById('whatsapp').value.trim();
      const email = document.getElementById('email').value.trim();
      formData.append('name', name);
      formData.append('whatsapp', whatsapp);
      formData.append('email', email);
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
  
      fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert("Upload realizado com sucesso!");
            uploadForm.reset();
            filePreview.innerHTML = '';
            selectedFiles = [];
            selectFilesBtn.disabled = true;
            uploadBtn.disabled = true;
          } else {
            alert("Erro no upload: " + data.error);
          }
        })
        .catch(err => {
          console.error("Erro:", err);
          alert("Ocorreu um erro ao enviar os arquivos.");
        });
    });
  });
  
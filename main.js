// Verifica se está rodando em ambiente Electron
const isElectron = !!(process.versions && process.versions.electron);
let electronApp, BrowserWindow, Tray, Menu;
if (isElectron) {
  ({ app: electronApp, BrowserWindow, Tray, Menu } = require('electron'));
}

const path = require('path');
const fs = require('fs');

// ----------------------
// Configuração do Express, WhatsApp e Google Drive
// ----------------------
const express = require('express');
const multer  = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');

// Importa a biblioteca do Google APIs
const { google } = require('googleapis');

// Configurações do servidor: utiliza process.env.PORT (para Railway) ou 3001 como fallback
const SERVER_PORT = process.env.PORT || 3001;

// --- Variáveis Globais ---
let mainWindow = null;    // Janela pública (interface para visitantes)
let qrWindow = null;      // Janela para exibir o QR Code (somente para admin)
let tray = null;          // Ícone na bandeja do sistema

// ----------------------
// Função para criar a janela principal (somente se Electron estiver disponível)
function createMainWindow() {
  if (!isElectron) return;
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');

  // Intercepta o evento de minimizar e oculta a janela
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });
}

if (isElectron) {
  electronApp.whenReady().then(() => {
    createMainWindow();

    // Cria o ícone na bandeja do sistema (tray)
    tray = new Tray(path.join(__dirname, 'assets', 'logo.png')); // Use seu logo ou outro ícone desejado
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Restaurar', click: () => { mainWindow.show(); } },
      { label: 'Sair', click: () => { electronApp.quit(); } }
    ]);
    tray.setToolTip('Festa de 15 Anos - Maria Eduarda Trudes');
    tray.setContextMenu(contextMenu);

    electronApp.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  electronApp.on('window-all-closed', () => {
    if (process.platform !== 'darwin') electronApp.quit();
  });
} else {
  console.log("Rodando em ambiente Node (sem Electron).");
}

// ----------------------
// Express Server Setup
// ----------------------
const serverApp = express();
serverApp.use(cors());
serverApp.use(bodyParser.json());
serverApp.use(bodyParser.urlencoded({ extended: true }));
serverApp.use(express.static(__dirname));

// Configuração do multer para uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// ----------------------
// Funções utilitárias
// ----------------------
function padNumber(num, size) {
  let s = num.toString();
  while (s.length < size) s = "0" + s;
  return s;
}

function getCurrentDate() {
  const now = new Date();
  let dd = String(now.getDate()).padStart(2, '0');
  let mm = String(now.getMonth() + 1).padStart(2, '0');
  let yyyy = now.getFullYear();
  return dd + '-' + mm + '-' + yyyy;
}

// Função para ler JSON de forma segura (para evitar "Unexpected end of JSON input")
function safeReadJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
    return [];
  }
  try {
    let content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) {
      fs.writeFileSync(filePath, '[]', 'utf8');
      return [];
    }
    return JSON.parse(content);
  } catch (err) {
    console.error(`Erro ao ler ${filePath}:`, err);
    fs.writeFileSync(filePath, '[]', 'utf8');
    return [];
  }
}

// ----------------------
// Configuração do Google Drive API
// ----------------------
// Certifique-se de que a pasta "credentials" exista em C:\Dudatrudes\credentials\ e que o arquivo "service-account.json" esteja lá.
const serviceAccount = require('./credentials/service-account.json');
const authDrive = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/drive.file']
});
const drive = google.drive({ version: 'v3', auth: authDrive });
// Substitua "your_drive_folder_id" pelo ID da pasta compartilhada no seu Google Drive.
const DRIVE_FOLDER_ID = "your_drive_folder_id";

// ----------------------
// Configuração do WhatsApp Web.js
// ----------------------
const paiPhone = "5513974111690";          // Pai: Junior Trudes
const assessorPhone = "5513996136266";       // Assessor: Thiago Schwanz
const aniversariantePhone = "5513XXXXXXXXXX"; // Aniversariante: Maria Eduarda (substitua pelo número completo)

const mainContacts = [paiPhone, assessorPhone, aniversariantePhone];

const waClient = new Client({
  authStrategy: new LocalAuth()
});

waClient.on('qr', (qr) => {
  // Exibe o QR Code no terminal (opcional)
  qrcodeTerminal.generate(qr, { small: true });
  console.log('QR Code recebido. Por favor, escaneie com o WhatsApp (somente admin).');

  // Se estiver em Electron, abre uma janela separada para o QR Code
  if (isElectron) {
    if (!qrWindow) {
      qrWindow = new BrowserWindow({
        width: 300,
        height: 400,
        title: "QR Code - Admin",
        webPreferences: {
          nodeIntegration: true,  // Permite uso de require
          contextIsolation: false
        }
      });
      qrWindow.loadFile('qrcode.html');
      qrWindow.on('closed', () => {
        qrWindow = null;
      });
    }
    // Envia o QR Code para a janela via IPC
    if (qrWindow) {
      qrWindow.webContents.send('qr-code', qr);
    }
  }
});

waClient.on('ready', () => {
  console.log('WhatsApp client está pronto!');
});
waClient.initialize();

waClient.on('message', async (message) => {
  const from = message.from;
  const phoneNumber = from.split('@')[0];

  if (mainContacts.includes(phoneNumber)) {
    if (!global.mainConvoCount) global.mainConvoCount = {};
    if (!global.mainConvoCount[phoneNumber]) {
      global.mainConvoCount[phoneNumber] = 1;
      await waClient.sendMessage(from, "O tio Thiago ainda não programou a minha inteligência artificial. Por enquanto, só envio avisos de novos envios. Qualquer coisa, briga com ele!");
    } else if (global.mainConvoCount[phoneNumber] === 1) {
      global.mainConvoCount[phoneNumber] = 2;
      await waClient.sendMessage(from, "Ei! Já avisei que não posso conversar muito!");
    } else if (global.mainConvoCount[phoneNumber] === 2) {
      global.mainConvoCount[phoneNumber] = 3;
      await waClient.sendMessage(from, "Ahhh! Duvida de mim? Então pergunte direto para o Thiago! Tô chamando ele aqui.");
      await waClient.sendMessage("551192830070@c.us", "DuDa ou Nilton estão interagindo com seu robô EVENTA");
    }
  } else {
    if (!global.guestReplied) global.guestReplied = {};
    if (!global.guestReplied[phoneNumber]) {
      global.guestReplied[phoneNumber] = true;
      const replyMsg = "Olá! Esse sistema foi desenvolvido por Thiago Dias Schwanz - ZIPHIOS Tecnologia.\nCaso esteja precisando de alguma ferramenta ou sistema para o seu evento, entre em contato: http://wa.me/551192830070";
      await waClient.sendMessage(from, replyMsg);
    }
  }
});

// ----------------------
// Rota de Upload com integração ao Google Drive
// ----------------------
serverApp.post('/upload', async (req, res) => {
  // Usamos async para aguardar o upload para o Drive.
  const { name, whatsapp, email } = req.body;
  const dateStr = getCurrentDate();

  if (!name || !whatsapp || !email) {
    return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
  }
  
  // Lê e grava leads.json de forma segura
  const leadsPath = path.join(__dirname, 'data', 'leads.json');
  let leads = safeReadJSON(leadsPath);
  const leadData = { name, whatsapp, email, date: dateStr, filesCount: req.files.length };
  leads.push(leadData);
  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
  
  // Lê e grava convidados.json de forma segura
  const convidadosPath = path.join(__dirname, 'data', 'convidados.json');
  let convidados = safeReadJSON(convidadosPath);
  let guestIndex = convidados.findIndex(g => g.name === name && g.whatsapp === whatsapp);
  let startingSequence = 0;
  if (guestIndex !== -1) {
    startingSequence = convidados[guestIndex].filesCount || 0;
  } else {
    convidados.push({ name, whatsapp, email, filesCount: 0 });
    guestIndex = convidados.length - 1;
  }
  
  // Processa cada arquivo enviado
  for (let index = 0; index < req.files.length; index++) {
    const file = req.files[index];
    const sequence = padNumber(startingSequence + index + 1, 5);
    const ext = path.extname(file.originalname);
    const newFileName = `${name} - ${whatsapp} - ${dateStr} - ${sequence}${ext}`;
    const newPath = path.join(file.destination, newFileName);

    // Renomeia o arquivo localmente
    fs.renameSync(file.path, newPath);

    // Envia o arquivo para o Google Drive
    try {
      const fileStream = fs.createReadStream(newPath);
      const driveRes = await drive.files.create({
        requestBody: {
          name: newFileName,
          parents: [DRIVE_FOLDER_ID]  // Certifique-se de que a pasta está compartilhada com a conta de serviço
        },
        media: {
          body: fileStream
        }
      });
      console.log("Arquivo enviado para o Drive, ID:", driveRes.data.id);
    } catch (err) {
      console.error("Erro ao enviar arquivo para o Drive:", err);
    }
  }

  convidados[guestIndex].filesCount = startingSequence + req.files.length;
  fs.writeFileSync(convidadosPath, JSON.stringify(convidados, null, 2));
  
  // Envia mensagens via WhatsApp
  try {
    waClient.sendMessage(whatsapp + "@c.us", "Obrigado por compartilhar suas fotos e vídeos! Você fez parte de um momento incrível na festa da Maria Eduarda Trudes.");
    waClient.sendMessage(paiPhone + "@c.us", `Novo envio de arquivos:\nNome: ${name}\nWhatsApp: ${whatsapp}\nData: ${dateStr}\nArquivos: ${req.files.length}`);
    waClient.sendMessage(assessorPhone + "@c.us", `Novo envio de arquivos:\nNome: ${name}\nWhatsApp: ${whatsapp}\nData: ${dateStr}\nArquivos: ${req.files.length}`);
    waClient.sendMessage(aniversariantePhone + "@c.us", `Novo envio de arquivos:\nNome: ${name}\nWhatsApp: ${whatsapp}\nData: ${dateStr}\nArquivos: ${req.files.length}`);
  } catch (err) {
    console.error("Erro ao enviar mensagens via WhatsApp:", err);
  }
  res.json({ success: true, message: 'Upload realizado com sucesso!' });
});

// ----------------------
// Inicia o servidor Express
// ----------------------
serverApp.listen(SERVER_PORT, () => {
  console.log(`Servidor Express rodando na porta ${SERVER_PORT}`);
});

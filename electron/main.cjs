const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const http = require('http');

// 1. Trata eventos do instalador Squirrel no Windows para evitar subir o servidor de forma espúria
if (process.platform === 'win32') {
  const squirrelCommand = process.argv[1];
  if (
    squirrelCommand === '--squirrel-install' ||
    squirrelCommand === '--squirrel-updated' ||
    squirrelCommand === '--squirrel-uninstall' ||
    squirrelCommand === '--squirrel-obsolete'
  ) {
    app.quit();
    process.exit(0);
  }
}

// 2. Trava de Instância Única (Single Instance Lock)
// Impede que múltiplas instâncias rodem ao mesmo tempo e gerem erro de porta (EADDRINUSE)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Configura dotenv para ler o arquivo .env no caminho correto dentro do asar/empacotamento
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '../.env') });
  console.log('Arquivo .env carregado com sucesso em main.cjs');
} catch (e) {
  console.error('Erro ao carregar dotenv em main.cjs:', e);
}

const PORT = process.env.PORT || '3009';
process.env.PORT = PORT;

// Tratamento de exceções não capturadas para diagnóstico de erros
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado no processo principal:', error);
  const errMsg = error.code === 'EADDRINUSE' || error.message.includes('EADDRINUSE')
    ? `A porta ${PORT} já está em uso por outro aplicativo ou outra instância do sistema já está aberta.\n\nPor favor, feche as outras janelas do sistema ou aplicativos rodando na porta ${PORT} e tente novamente.`
    : `Ocorreu um erro inesperado ao iniciar a aplicação:\n\n${error.stack || error.message || error}`;
  
  dialog.showErrorBox(
    'MDR INFORMATICA E CELULARES - Erro de Inicialização',
    errMsg
  );
  app.quit();
  process.exit(1);
});

let mainWindow;

function checkServerReady(url, callback) {
  const req = http.get(url, (res) => {
    if (res.statusCode === 200) {
      callback();
    } else {
      setTimeout(() => checkServerReady(url, callback), 100);
    }
  });
  req.on('error', () => {
    setTimeout(() => checkServerReady(url, callback), 100);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/logo-mdr.png'),
  });

  // Aguarda o servidor local iniciar antes de carregar a URL
  checkServerReady(`http://localhost:${PORT}/api/health`, () => {
    if (mainWindow) {
      mainWindow.loadURL(`http://localhost:${PORT}`);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startProductionServer() {
  if (app.isPackaged) {
    // Força o ambiente para produção para que o Express não tente iniciar o Vite dev server
    process.env.NODE_ENV = 'production';
    try {
      const serverPath = path.join(__dirname, '../dist-server/server.cjs');
      require(serverPath);
      console.log('Servidor de produção carregado com sucesso.');
    } catch (error) {
      console.error('Erro ao carregar o servidor de produção:', error);
    }
  }
}

app.whenReady().then(() => {
  // Se o Single Instance Lock foi concedido, inicia o servidor e a janela
  startProductionServer();
  createWindow();

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    process.exit(0); // Garante a liberação imediata da porta e encerramento do processo Node!
  }
});

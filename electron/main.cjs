
const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");
const fs = require("node:fs");

let mainWindow;
let serverProcess;
let quitting = false;

const PORT = "3001";
const HOST = "127.0.0.1";
const SERVER_URL = `http://${HOST}:${PORT}`;
const LOG_FILE = path.join(app.getPath("userData"), "mti-crm-startup.log");

const appStartedAt = Date.now();

function log(message) {
  try {
    fs.appendFileSync(
      LOG_FILE,
      `[${new Date().toISOString()}] [+${((Date.now() - appStartedAt) / 1000).toFixed(2)}s] ${message}\n`
    );
  } catch {}
}

function getResourcePath(...parts) {
  return path.join(process.resourcesPath, ...parts);
}

function startupPage() {
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MTI Repairing CRM</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;
justify-content:center;background:#f4f6fa;color:#172033;
font-family:Segoe UI,Arial,sans-serif}
main{text-align:center;padding:32px}
h1{font-size:30px;margin-bottom:10px;color:#173b70}
p{color:#526078;font-size:16px}
.spinner{width:36px;height:36px;margin:26px auto;border:4px solid #dce4ef;
border-top-color:#2463eb;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body><main>
<h1>MTI Repairing CRM</h1>
<div class="spinner"></div>
<p>Software start ho raha hai. Kripya intezar karein...</p>
</main></body></html>`;

  return `data:text/html;charset=UTF-8,${encodeURIComponent(html)}`;
}

function startServer() {
  const nodeExe = getResourcePath("runtime", "node.exe");
  const serverFile = getResourcePath("app", "server.js");

  log(`Node executable: ${nodeExe}`);
  log(`Server file: ${serverFile}`);
  log(`Node exists: ${fs.existsSync(nodeExe)}`);
  log(`Server exists: ${fs.existsSync(serverFile)}`);

  if (!fs.existsSync(nodeExe) || !fs.existsSync(serverFile)) {
    throw new Error("CRM server ki required files nahi mili hain.");
  }

  const startedAt = Date.now();
  log(`About to spawn Node server; elapsed=${((Date.now() - appStartedAt) / 1000).toFixed(2)}s`);

  serverProcess = spawn(nodeExe, [serverFile], {
    cwd: getResourcePath("app"),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT,
      HOSTNAME: HOST
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  serverProcess.stdout.on("data", data => {
    log(`SERVER OUT: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on("data", data => {
    log(`SERVER ERROR: ${data.toString().trim()}`);
  });

  serverProcess.on("error", error => {
    log(`SPAWN ERROR: ${error.stack || error.message}`);
  });

  serverProcess.on("exit", (code, signal) => {
    log(`SERVER EXIT: code=${code}, signal=${signal}, elapsed=${((Date.now() - startedAt) / 1000).toFixed(2)}s`);
  });
}

function waitForServer(timeoutMs = 60000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    let finished = false;

    function check() {
      if (finished || quitting) return;

      if (Date.now() - startedAt >= timeoutMs) {
        finished = true;
        reject(new Error("CRM server 60 seconds mein start nahi hua. Startup log check karein."));
        return;
      }

      const req = http.get(SERVER_URL, res => {
        const status = res.statusCode;
        res.resume();

        if (finished) return;

        finished = true;
        log(`HTTP response: ${status}; server wait=${((Date.now() - startedAt) / 1000).toFixed(2)}s`);
        resolve();
      });

      req.setTimeout(1500, () => req.destroy());

      req.on("error", () => {
        if (!finished) {
          setTimeout(check, 500);
        }
      });
    }

    check();
  });
}

async function openCRM() {
  try {
    await waitForServer();

    if (!mainWindow || mainWindow.isDestroyed() || quitting) return;

    const pageStartedAt = Date.now();
    log("Loading CRM dashboard URL.");

    await mainWindow.loadURL(SERVER_URL);

    log(`Electron page load completed in ${((Date.now() - pageStartedAt) / 1000).toFixed(2)}s`);
  } catch (error) {
    log(`WINDOW ERROR: ${error.stack || error.message}`);

    if (!quitting && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        "MTI Repairing CRM",
        `${error.message}\n\nStartup log:\n${LOG_FILE}`
      );
    }
  }
}

app.setPath("sessionData", path.join(app.getPath("userData"), "session"));

app.whenReady().then(() => {
  log("Electron app ready.");

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    title: "MTI Repairing CRM",
    backgroundColor: "#f4f6fa",
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, code, description, url) => {
      log(`PAGE LOAD FAILED: code=${code}, description=${description}, url=${url}`);
    }
  );

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    log(`RENDER PROCESS GONE: ${JSON.stringify(details)}`);
  });

  mainWindow.webContents.on("console-message", (_event, details) => {
    log(`BROWSER CONSOLE: ${details.message}`);
  });

  mainWindow.loadURL(startupPage()).catch(error => {
    log(`STARTUP SCREEN ERROR: ${error.message}`);
  });

  try {
    startServer();
    openCRM();
  } catch (error) {
    log(`START ERROR: ${error.stack || error.message}`);
    dialog.showErrorBox("MTI Repairing CRM", error.message);
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  quitting = true;
  log("Electron app quitting.");

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});


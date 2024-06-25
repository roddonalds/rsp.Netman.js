global.activeWifiInterface = null;

const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, dialog } = require('electron');
const prompt = require('electron-prompt')
const path = require('path');
const shell = require('shelljs');
const wifi = require('node-wifi');

const env = process.env,
      nodeEnv = env.NODE_ENV || 'development';

let tray;
let mainWindow;

let mainWindowSkel = {
    resizable: true,
    minimizable: true,
    hidden: false,
    show: true,
    icon: path.join(__dirname, 'icon.png')
};

let mainWebOptionsSkel = {
    nodeIntegration: true,
    contextIsolation: false
}

if (nodeEnv === 'development') {
    mainWindowSkel.width = 970;
    mainWindowSkel.height = 1000;
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('ready', () => {

    mainWindow = new BrowserWindow({
        width: 963,
        height: 600,
        ...mainWindowSkel,
        webPreferences: {
            ...mainWebOptionsSkel    
        }
    });

    // Center the window
    mainWindow.center();

    // Load the index.html of the app
    mainWindow.loadFile('index.html');

    // Open devtools automatically
    if(nodeEnv === 'development') {
        mainWindow.webContents.openDevTools();
    }
    
    mainWindow.on('close', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });

    mainWindow.webContents.on('did-finish-load', () => {
        loadStack()
    });

    // Set up tray icon
    tray = new Tray(path.join(__dirname, 'icon.png'));

    tray.setToolTip('Wi-Fi Network List');

    tray.setContextMenu(Menu.buildFromTemplate([
        
        {
            label: 'Show App',
            click: () => {
                mainWindow.show();
            },
        },

        {
            label: 'Quit',
            click: () => {
                app.isQuiting = true;
                app.quit();
            },
        },

    ]));
});

// IPC listener for handling connect/disconnect actions
ipcMain.on('wifi-action', (event, action, payload) => {
    switch (action) {
        case 'connect':
            connectToWifi(payload);
            break;
        case 'disconnect':
            disconnectFromWifi(payload);
            break;
        case 'setup':
            setupWifiConnection(payload);
        case 'load': 
            loadStack(payload)
        default:
            console.warn('Unknown action:', action);
            break;
    }
});

function loadStack(payload) {

    if (payload) {
        global.activeWifiInterface = payload;
    }

    loadWifiInterfaces(() => {
        console.log('Wifi interfaces were loaded')
        loadWifiNetworks(() => {
            console.log('Wifi networks were loaded')
            loadActiveConnections(() => {
                console.log('Wifi active connections were loaded')
                console.log('activeWifiInterface', global.activeWifiInterface)
            });
        });
    });
}

function loadWifiNetworks(callback) {
    wifi.scan().then(networks => {
        mainWindow.webContents.send('wifi-networks', networks);
        callback()
    }).catch(err => {
        console.error('Failted to scan Wifi Networks:');
        console.error(err);
    });
}

function loadActiveConnections(callback) {
    
    wifi.getCurrentConnections((error, currentConnections) => {
        if (error) {
            console.log(error);
        } else {
            mainWindow.webContents.send('wifi-connections', currentConnections);
        }
    });

    callback()
}

function loadWifiInterfaces (callback) {

    require('./api/getInterfaces.js')(wifiInterfaces => {

        const activeWifif = global.activeWifiInterface || wifiInterfaces.primaryInterface 

        wifi.init({
            iface: activeWifif.name
        });
             
        mainWindow.webContents.send('wifi-interfaces', {
            list: wifiInterfaces.list,
            active: activeWifif
        });

        callback()

    }, 'wifi')
}

function setupWifiConnection(network) {

    // Placeholder: Implement logic to open the Wi-Fi settings for the selected network
    // For example, using shell commands or an Electron Wi-Fi library
    console.log('Opening settings for:', network.ssid);

    shell.exec(`nm-connection-editor`, (code, stdout, stderr) => {
        if (code !== 0) {
            console.error('Error opening Wi-Fi settings:', stderr);
            // Notify the user of the error
            new Notification({
                title: 'Settings Error',
                body: `Failed to open settings for ${network.ssid}.`,
                icon: path.join(__dirname, 'icon.png')
            }).show();
        } else {
            console.log('Opened settings successfully for:', network.ssid);
            // Optionally, notify the user of successful opening
            new Notification({
                title: 'Wi-Fi Settings',
                body: `Opened settings for ${network.ssid}.`,
                icon: path.join(__dirname, 'icon.png')
            }).show();
        }
    });
}

async function connectToWifi(network) {

    // Placeholder: Implement logic to connect to the selected Wi-Fi network
    // For example, using shell commands or an Electron Wi-Fi library
    console.log('Connecting to:', network.ssid);
    
    const password = await askWifiPassword(network);

    console.log('Password', password);
    
    shell.exec(`nmcli device wifi connect '${network.ssid}' password '${password}'`, (code, stdout, stderr) => {
        if (code !== 0) {
            console.error('Error connecting to Wi-Fi:', stderr);
            // Notify the user of the error
            new Notification({
                title: 'Connection Error',
                body: `Failed to connect to ${network.ssid}. Check your password and try again.`,
                icon: path.join(__dirname, 'icon.png')
            }).show();
        } else {
            console.log('Connected successfully to:', network.ssid);
            // Optionally, notify the user of successful connection
            new Notification({
                title: 'Wi-Fi Connected',
                body: `Successfully connected to ${network.ssid}.`,
                icon: path.join(__dirname, 'icon.png')
            }).show();
        }

        loadStack()

    });
}

function disconnectFromWifi(network) {

    // Placeholder: Implement logic to disconnect from the current Wi-Fi network
    // For example, using shell commands or an Electron Wi-Fi library
    console.log(`Disconnecting ${network.iface} from:`, network.ssid);

    shell.exec(`nmcli device disconnect '${network.iface}'`, (code, stdout, stderr) => {
        if (code !== 0) {
            console.error('Error disconnecting Wi-Fi:', stderr);
            // Notify the user of the error
            new Notification({
                title: 'Disconnection Error',
                body: `Failed to disconnect from ${network.ssid}.`,
                icon: path.join(__dirname, 'icon.png')
            }).show();
        } else {
            console.log('Disconnected successfully from:', network.ssid);
            // Optionally, notify the user of successful disconnection
            new Notification({
                title: 'Wi-Fi Disconnected',
                body: `Successfully disconnected from ${network.ssid}.`,
                icon: path.join(__dirname, 'icon.png')
            }).show();
        }

        loadStack()

    });
}

async function askWifiPassword (network) {

    return await prompt(mainWindow, {
        type: 'input',
        title: 'Authentication',
        label: 'Enter Password:',
        inputAttrs: {
            style: `background-color: rgba(0,0,0,1)`,
            type: 'password'
        }
    });
}

function getWifiPassword() {

    const { execSync } = require('child_process');

    // Get the connection UUID of the active WiFi connection
    const connectionUuid = execSync('nmcli -t -f UUID,TYPE con show --active | grep wifi | cut -d ":" -f 2').toString().trim();

    console.log('connectionUuid:', connectionUuid);

    if (connectionUuid) {
        const psk = execSync(`sudo nmcli -s -g 802-11-wireless-security.psk connection show ${connectionUuid}`, { stdio: 'pipe' }).toString().trim();
        console.log('WiFi password:', psk);
        return psk;
    } else {
        console.log('No active WiFi connection found.');
    }

}

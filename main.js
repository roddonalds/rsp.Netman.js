const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, dialog } = require('electron');
const prompt = require('electron-prompt')
const path = require('path');
const shell = require('shelljs');
const wifi = require('node-wifi');
const os = require('os');
const { execSync } = require('child_process');


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


// IPC listener for handling connect/disconnect actions
ipcMain.on('wifi-action', (event, action, network) => {
    switch (action) {
        case 'connect':
            connectToWifi(network);
            break;
        case 'disconnect':
            disconnectFromWifi(network);
            break;
        case 'settings':
            setupWifiConnection(network);
        default:
            console.warn('Unknown action:', action);
            break;
    }
});

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
        width: 800,
        height: 600,
        ...mainWindowSkel,
        webPreferences: {
            ...mainWebOptionsSkel    
        }
    });

    // Center the window
    mainWindow.center();

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
        loadWifiInterfaces();
        loadWifiNetworks();
        loadActiveConnections();
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

function loadWifiNetworks() {
    wifi.scan().then(networks => {
        mainWindow.webContents.send('wifi-networks', networks);
    }).catch(err => {
        console.error('Failted to scan Wifi Networks:');
        console.error(err);
    });
}

function loadActiveConnections() {
    wifi.getCurrentConnections((error, currentConnections) => {
        if (error) {
            console.log(error);
        } else {
            mainWindow.webContents.send('wifi-connections', currentConnections);
        }
    });
}

function loadWifiInterfaces() {
    
    const interfaces = os.networkInterfaces();
    
    let wifiInterfaces = [];

    Object.keys(interfaces).forEach((iface) => {
        interfaces[iface].forEach((details) => {
            if (details.family === 'IPv4' && !details.internal && /wlan|wifi|wl/.test(iface)) {
                wifiInterfaces.push({
                    name: iface,
                    mac: details.mac,
                    address: details.address,
                    netmask: details.netmask,
                });
            }
        });
    });

    wifi.init({
        iface: getCurrentInternetInterface() // network interface, choose a random wifi interface if set to null
    });
    
    mainWindow.webContents.send('wifi-interfaces', {
        list: wifiInterfaces,
        active: getCurrentInternetInterface()
    });
}

function getCurrentInternetInterface() {

    const interfaces = os.networkInterfaces();
    
    let defaultInterface = null;

    try {
        const route = execSync('ip route get 8.8.8.8').toString();
        const match = route.match(/dev (\w+)/);

        if (match) {
            const interfaceName = match[1];
            if (interfaces[interfaceName]) {
                defaultInterface = interfaceName;
            }
        }
    } catch (error) {
        console.error('Error executing command:', error);
    }

    return defaultInterface;
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
        // Reload the Wi-Fi networks list after attempting to connect
        loadWifiNetworks();

        // load the active connections
        loadActiveConnections();
    });
}

function disconnectFromWifi(network) {
    // Placeholder: Implement logic to disconnect from the current Wi-Fi network
    // For example, using shell commands or an Electron Wi-Fi library
    console.log('Disconnecting from:', network.ssid);

    shell.exec(`nmcli device disconnect '${network.device}'`, (code, stdout, stderr) => {
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
        // Reload the Wi-Fi networks list after attempting to disconnect
        loadWifiNetworks();
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

// Function to get the WiFi password of the current connection
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

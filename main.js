const { 
    
    app, 
    Tray, 
    Menu, 
    ipcMain, 
    session,
    Notification,
    BrowserWindow

} = require('electron');

const prompt = require('electron-prompt')
const path = require('path');
const shelljs = require('shelljs');
const wifi = require('node-wifi');

shelljs.config.execPath = '/usr/bin/node';
shelljs.exec('killall rsp.wifiman');

const env = process.env,
      nodeEnv = env.NODE_ENV;

global.activeWifiInterface = null;

let tray;
let mainWindow;

let mainWindowSkel = {
    resizable: true,
    minimizable: true,
    hidden: false,
    show: true,
    zoomFactor: 0.7,
    icon: path.join(__dirname, 'build', 'icons', '256x256.png')
};

let mainWebOptionsSkel = {
    nodeIntegration: true,
    contextIsolation: false
}

app.commandLine.appendSwitch('force_high_performance_gpu', true)

app.setLoginItemSettings({
    openAtLogin: true    
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('ready', () => {

    mainWindow = new BrowserWindow({
        ...mainWindowSkel,
        width: 610,
        height: 777,
        resizable: nodeEnv === 'development' ? true : false,
        webPreferences: {
            ...mainWebOptionsSkel
        }
    });

    // Center the window
    mainWindow.center();

    // Load the index.html of the app
    mainWindow.loadFile('index.html');
    
    mainWindow.on('close', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });

    mainWindow.webContents.on('did-finish-load', () => {
        loadStack()
        createTray();
        createMainMenu();
        initWifiNetworksReloader();
    });

    if (nodeEnv === 'development') {
        session.defaultSession.loadExtension('/home/rsp/.config/google-chrome/Default/Extensions/nhdogjmejiglipccpnnnanhbledajbpd/6.6.3_0').then(() => {
            mainWindow.webContents.openDevTools();
        })
    }
});

ipcMain.on('app-action', (event, action, payload) => {
    if (action === 'hide') {
        mainWindow.hide();
    }
})

ipcMain.on('wifi-action', (event, action, payload) => {

    if (action === 'load') {
    
        loadStack(payload)
    
    } else if (action === 'setup') {
    
        setupWifiConnection(payload)
    
    } else if (action === 'connect') {
    
        connectToWifi(payload)
    
    } else if (action === 'disconnect') {
    
        disconnectFromWifi(payload)
    
    } else {
        console.warn('Unknown action:', action);
    }

});

function loadStack(payload) {

    if (payload) {
        global.activeWifiInterface = payload;
    }

    loadWifiInterfaces(() => {

        console.log('Wifi interfaces were loaded')
        
        loadKnownWifis(knownWifis => {
        
            console.log('Wifi known networks were loaded')

            loadWifiNetworks(knownWifis, () => {
        
                console.log('Wifi disposable networks were loaded')  
        
                loadActiveConnections(() => { 
        
                    console.log('Wifi active connections were loaded')
        
                })
            })
        });
    });
}

function loadWifiNetworks(knownWifis, callback) {

    wifi.scan().then(networks => {
        
        networks = networks.map(network => {
            
            const knownNetwork = knownWifis.find(known => known.ssid === network.ssid);
            
            network.known = !!knownNetwork;

            if (network.known) {
                network.qrcode = knownNetwork.qrcode;
                network.password = knownNetwork.password;
            }

            return network;

        });

        mainWindow.webContents.send('wifi-networks', networks);

        callback()

    }).catch(err => {
        console.error('Failted to scan Wifi Networks:');
        console.error(err);
    });
}

async function loadKnownWifis(callback) {
    require('./api/getKnownWifiNetworks.js')(knownWifis => {  
        mainWindow.webContents.send('wifi-networks-known', knownWifis);
        callback(knownWifis)
    });
}

function loadActiveConnections(callback) {
    
    wifi.getCurrentConnections((error, currentConnections) => {
        
        if (error) {
            console.log(error);
        } else {
            mainWindow.webContents.send('wifi-connections', currentConnections);
        }

        callback();

    });
}

function loadWifiInterfaces (callback) {

    require('./api/getInterfaces.js')(wifiInterfaces => {

        const activeWifi = global.activeWifiInterface || wifiInterfaces.primaryInterface 

        wifi.init({
            iface: activeWifi.name
        });
             
        mainWindow.webContents.send('wifi-interfaces', {
            list: wifiInterfaces.list,
            active: activeWifi
        });

        callback()

    }, 'wifi')
}

function setupWifiConnection(network) {

    // Placeholder: Implement logic to open the Wi-Fi settings for the selected network
    // For example, using shell commands or an Electron Wi-Fi library
    console.log('Opening settings for:', network.ssid);

    shelljs.exec(`nm-connection-editor`, (code, stdout, stderr) => {

        if (code !== 0) {

            console.error('Error opening Wi-Fi settings:', stderr);

            new Notification({
                title: 'Settings Error',
                body: `Failed to open settings for ${network.ssid}.`,
                icon: path.join(__dirname, 'build', 'icons', '256x256.png')
            }).show();

        } else {

            console.log('Opened settings successfully for:', network.ssid);

            new Notification({
                title: 'Wi-Fi Settings',
                body: `Opened settings for ${network.ssid}.`,
                icon: path.join(__dirname, 'build', 'icons', '256x256.png')
            }).show();
        }
    });
}

async function connectToWifi(network) {

    // Placeholder: Implement logic to connect to the selected Wi-Fi network
    // For example, using shell commands or an Electron Wi-Fi library
    console.log('Connecting to:', network.ssid);
    
    let password;

    if (network.known) {
        password = network.password;
    } else {
        password = await askWifiPassword(network);
    }
    
    console.log('Password', password);
    
    shelljs.exec(`nmcli device wifi connect '${network.ssid}' password '${password}'`, (code, stdout, stderr) => {
        if (code !== 0) {
            console.error('Error connecting to Wi-Fi:', stderr);
            // Notify the user of the error
            new Notification({
                title: 'Connection Error',
                body: `Failed to connect to ${network.ssid}. Check your password and try again.`,
                icon: path.join(__dirname, 'build', 'icons', '256x256.png')
            }).show();
        } else {
            console.log('Connected successfully to:', network.ssid);
            // Optionally, notify the user of successful connection
            new Notification({
                title: 'Wi-Fi Connected',
                body: `Successfully connected to ${network.ssid}.`,
                icon: path.join(__dirname, 'build', 'icons', '256x256.png')
            }).show();
        }

        loadStack()

    });
}

function disconnectFromWifi(network) {

    // Placeholder: Implement logic to disconnect from the current Wi-Fi network
    // For example, using shell commands or an Electron Wi-Fi library
    console.log(`Disconnecting ${network.iface} from:`, network.ssid);

    shelljs.exec(`nmcli device disconnect '${network.iface}'`, (code, stdout, stderr) => {
        if (code !== 0) {
            console.error('Error disconnecting Wi-Fi:', stderr);
            // Notify the user of the error
            new Notification({
                title: 'Disconnection Error',
                body: `Failed to disconnect from ${network.ssid}.`,
                icon: path.join(__dirname, 'build', 'icons', '256x256.png')
            }).show();
        } else {
            console.log('Disconnected successfully from:', network.ssid);
            // Optionally, notify the user of successful disconnection
            new Notification({
                title: 'Wi-Fi Disconnected',
                body: `Successfully disconnected from ${network.ssid}.`,
                icon: path.join(__dirname, 'build', 'icons', '256x256.png')
            }).show();
        }

        loadStack()

    });
}

async function askWifiPassword () {

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

function initWifiNetworksReloader () {
    
    if (nodeEnv === 'development') {
        return;
    }

    setInterval(() => {
        loadKnownWifis(knownWifis => {
            loadWifiNetworks(knownWifis, () => {
                console.log('Wifi disposable networks were loaded')       
            })
        })
    }, 1000 * 30); // lets increase the timeout of this cronjob which is the thing that updates the wifi networks list on the view, in order to avoid the app to be slow!!! :)
}

function createTray() {
    
    tray = new Tray(path.join(__dirname, 'build', 'icons', 'tray.png'));
    
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show', click: () => { mainWindow.show(); } },
        { label: 'Hide', click: () => { mainWindow.hide(); } }
    ]);

    tray.setToolTip('rsp.Wifiman - Wifi Connection Manager');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
}

function createMainMenu () {

    const menu = Menu.buildFromTemplate([
        {
            label: 'App',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Settings',
            submenu: [
                { role: 'reload' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'Less' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        require('electron').shelljs.openExternal('https://ropsoft.cloud/rsp-os')
                    }
                }
            ]
        }
    ]);

    if (process.env.NODE_ENV !== 'development') {
        Menu.setApplicationMenu(menu);
    }
}
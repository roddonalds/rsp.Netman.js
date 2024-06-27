const QRCode = require('qrcode');
const shell = require('shelljs');

shell.config.execPath = '/usr/bin/node'; // Example path, adjust according to your installation

// Função para gerar o código QR para a rede WiFi de forma assíncrona
function generateQRCode(ssid, password) {
  return new Promise((resolve, reject) => {
    const wifiString = `WIFI:T:WPA;S:${ssid};P:${password};;`;
    QRCode.toDataURL(wifiString, (error, qrcodeBase64) => {
      if (error) {
        console.error(`Error generating QR code for ${ssid}:`, error);
        resolve(null); // Resolve with null if there's an error
      } else {
        resolve(qrcodeBase64);
      }
    });
  });
}

// Função para obter detalhes da rede usando nmcli de forma síncrona
function getNetworkDetailsSync(ssid) {
  try {
    const details = shell.exec(`nmcli -t -f SSID,BSSID,CHAN,FREQ,MODE,SECURITY,SIGNAL connection show "${ssid}"`, { silent: true }).stdout.trim();
    const [ssidValue, bssid, channel, frequency, mode, security, signal] = details.split(':');
    return { ssid: ssidValue, bssid, channel, frequency, mode, security, signal_level: signal };
  } catch (error) {
    console.error(`Error getting details for ${ssid} on Linux:`, error);
    return null;
  }
}

// Implementação para Linux usando nmcli via shelljs de forma síncrona
function getNetworkPasswordLinuxSync(ssid) {
  try {
    const result = shell.exec(`nmcli -s -g 802-11-wireless-security.psk connection show "${ssid}"`, { silent: true }).stdout.trim();
    return result;
  } catch (error) {
    console.error(`Error getting password for ${ssid} on Linux:`, error);
    return null;
  }
}

// Obter as redes WiFi conhecidas e suas senhas de forma assíncrona com callback
function getKnownNetworks(callback) {
  
  const networksResult = shell.exec('nmcli -t -f NAME connection show', { silent: true }).stdout.trim();
  const networkLines = networksResult.split('\n');

  let knownWifiNetworks = [];

  function processNetworks(index) {
    if (index >= networkLines.length) {
      callback(knownWifiNetworks); // Call callback when all networks are processed
      return;
    }

    const ssid = networkLines[index].trim();

    if (ssid) {
      const details = getNetworkDetailsSync(ssid);

      if (details) {
        const password = getNetworkPasswordLinuxSync(ssid);
        generateQRCode(ssid, password)
          .then(qrcode => {
            if (password && qrcode) {
              knownWifiNetworks.push({
                ssid,
                qrcode,
                password
              });
            }
            processNetworks(index + 1); // Process next network
          })
          .catch(error => {
            console.error('Error generating QR code for:', ssid, error);
            processNetworks(index + 1); // Proceed even if there's an error
          });
      } else {
        processNetworks(index + 1); // Proceed if details are not available
      }
    } else {
      processNetworks(index + 1); // Proceed if SSID is empty
    }
  }

  // Start processing networks from index 0
  processNetworks(0);
}

module.exports = getKnownNetworks;

const os = require('os')

function getIPAddress (interfaceName) {

    console.log('interfaceName', interfaceName)

    const interfaces = os.networkInterfaces();
    const iface = interfaces[interfaceName];

    if (iface) {
        return iface[0].address;
    }
}

module.exports = getIPAddress;
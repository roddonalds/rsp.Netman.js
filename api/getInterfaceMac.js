const os = require('os')

function getInterfaceMac (interfaceName) {

    console.log('interfaceName', interfaceName)

    const interfaces = os.networkInterfaces();
    const iface = interfaces[interfaceName];

    if (iface) {
        return iface[0].mac;
    }
}

module.exports = getInterfaceMac;
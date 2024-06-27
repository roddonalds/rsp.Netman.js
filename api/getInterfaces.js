const ifconfig = require('wireless-tools/ifconfig');
const getInterfaceIp = require('./getInterfaceIp.js');
const getInterfaceMac = require('./getInterfaceMac.js');

function getInterfaces (callback, type) {

    ifconfig.status(function(err, entryface) {

        if (err) {
            return callback(err, null);
        }

        console.log('entryface', entryface);

        if (type === 'wifi') {
            entryface = entryface.filter(function(iface) {
                return iface.interface.includes('wl');
            })
        } else if (type === 'eth') {
            entryface = entryface.filter(function(iface) {
                return iface.interface.includes('en') || iface.interface.includes('et');
            })
        } else if (type === 'virt') {
            entryface = entryface.filter(function(iface) {
                return !iface.interface.includes('en') && !iface.interface.includes('wl');
            })
        } else {
            console.log('No interfaces type specified. Returning them all.')
            return entryface;
        }

        const fifaces = entryface.map(function(iface) {
            return { ...iface, interface: iface.interface.replace(':', '') }
        })

        const hififaces = fifaces.map(function(iface) {
            return { ...iface, ip: getInterfaceIp(iface.interface), mac: getInterfaceMac(iface.interface) }
        })

        const ifaces = hififaces.map(function(iface) {
            
            if (!iface.up) {
                return { ...iface, name: iface.interface, up: false }
            } else {
                return {...iface, name: iface.interface };
            }
        })

        const  list = ifaces, // wall interface from the type
               upList =  list.filter(iface => iface.up), // all up (shows on ifconfig - managed)
               downList =  list.filter(iface => !iface.up),
               connectedList = list.filter(iface => iface.ip); // all that have ip

        //  a primeira que tenha ip ou a primeira q seja up true
        const primaryInterface = connectedList[0] || upList[0] || downList[0];

        callback({
            list,
            primaryInterface
        });

    });
}

module.exports = getInterfaces;

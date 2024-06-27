require('../api/getInterfaces.js')(data => {
    console.log('Should return "wifi" all interfaces')
    console.log('data.list', data.list)
    console.log('data.primaryInterface', data.primaryInterface)
}, 'wifi')

require('../api/getInterfaces.js')(data => {
    console.log('Should return "eth" all interfaces')
    console.log('data.list', data.list)
    console.log('data.primaryInterface', data.primaryInterface)
}, 'eth')

require('../api/getInterfaces.js')(data => {
    console.log('Should return "virt" all interfaces')
    console.log('data.list', data.list)
    console.log('data.primaryInterface', data.primaryInterface)
}, 'virt')
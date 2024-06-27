require('../api/getKnownWifiNetworks.js')(data => {
    console.log('Should data of saved "wifi" connections by the NetworkManager')
    console.log('data.list', data)
})
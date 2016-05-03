var config = require('./config');
var alteredClient = require('./index');

//var Socket = require('primus.io').createSocket({ transformer: 'sockjs' });

alteredClient.events.on('new-notification', function(notification){

    console.log('notification', notification)

});

alteredClient.login(function(err, data){

    console.log('logged in', data);

});

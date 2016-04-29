var config = require('./config');
var alteredClient = require('./index');

var Socket = require('primus.io').createSocket({ transformer: 'websockets' });



alteredClient.login(function(err, data){

    console.log('logged in', data);

    alteredClient.getUser({}, function(user){

        console.log('user', user);

        // get socket instance
        var socket = new Socket('wss://api.altered.io:443?token='+alteredClient.token);

        socket.on('open', function(data) {

            console.log('socket open', data);
        });

        socket.on('subscribe', function (data) {
            console.log('subscribe', data); // => good morning
        });

        socket.send('subscribe', { type: 'user', id: user.id });


    });



});

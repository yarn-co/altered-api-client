var config = require('./config');
var alteredClient = require('./index')(config);
var req = require('req-fast');
var Timer = require('timer.js');
var timer = new Timer();

//var Socket = require('primus.io').createSocket({ transformer: 'sockjs' });

alteredClient.events.on('new-notification', function(notification){

    console.log('notification', notification)

});

alteredClient.login(function(err, data){

    console.log('logged in', data);

    speedTest();

});

var speedTest2 = function(){

    for(var i = 0; i < 10; i++){


        var test = function(iteration){

            setTimeout(function(){

                timer.measureStart('interaction' + iteration);

                req({
                    url: 'https://api.altered.io/' + 'interactions',
                    method: 'POST',
                    dataType: 'json',
                    headers: {
                        'Authorization': 'Bearer ' + alteredClient.tokens.access
                    },
                    data: {body: "testing" + iteration, type: "say"}

                },  function(err, resp){

                    console.log('reg interaction', iteration, timer.measureStop('interaction' + iteration));

                });

            },500 * iteration);

        }

        test(i);

        /*
        */
    }

}

var speedTest = function(){

    for(var i = 0; i < 10; i++){


        var test = function(iteration){

            setTimeout(function(){

                timer.measureStart('interaction' + iteration);

                var args = {
                    data: {body: "test", type: "say"}
                };

                alteredClient.addInteraction(args, function(response){

                    console.log('sent interaction', iteration, timer.measureStop('interaction' + iteration));
                });

            },500 * iteration);

        }

        test(i);

        /*
        */
    }

}

var alteredClient = require('./index');


alteredClient.login(function(err, data){

    console.log('logged in', data);

    alteredClient.getUser({}, function(user){

        console.log('user', user);
    })

});

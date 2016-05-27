var Client = require('node-rest-client').Client;
var Socket = require('primus.io').createSocket({ transformer: 'sockjs' });
var config = require('./config');

var EventEmitter = require('events').EventEmitter;
var util = require('util');

function MyEmitter() {
    EventEmitter.call(this);
}

util.inherits(MyEmitter, EventEmitter);

var alteredClient = {

    config: config,
    events: new MyEmitter(),
    client: new Client(),
    token: undefined,
    tokenHeader: undefined,
    refreshToken: undefined,
    primus: undefined,
    headers: { "Content-Type": "application/json" },

    makeMethod: function(name){

        var self = this;

        var method = function(args, callback){

            self.addTokenHeader();

            if(args){

                args['headers'] = this.headers;

            }else{

                args = {headers: this.headers}
            }

            try{

                var request = self.client.methods[name](args, function(response){

                    //console.log('makeMethod', response, response.message);

                    if(response && response.message && response.message == 'Token expired'){

                        console.log('expired token.');

                        self.refreshToken(function(){

                            //retry request after new token:

                            console.log('token refreshed.');

                            self[name](args, callback);
                        });

                    }else{

                      callback(response);
                    }

                });

                request.on('error', function (err) {

                	console.log('api request failed', err.request.options);
                });

            }catch(err){

                console.log('api request error', err);
            }

        };

        //method.name = name;

        return method;

    },

    registerMethod: function(name, route, method){

        this.client.registerMethod(name, this.config.api + route, method);

        this[name] = this.makeMethod(name);
    },


    registerMethods: function(){

        this.registerMethod('getToken', 'token', 'POST');
        this.registerMethod('getRefreshToken', 'token/refresh', 'POST');
        this.registerMethod('getUser', 'user', 'GET');
        this.registerMethod('addInteraction', 'interactions', 'POST');
        this.registerMethod('updateAvatar', 'avatar', 'POST');
    },

    addTokenHeader: function(){

        if(this.tokens && this.tokens.access){

            this.headers['Authorization'] = 'Bearer ' + this.tokens.access;
        }
    },


    strapPrimus: function(callback){

        var self = this;

        this.primus = new Socket(this.config.api + '?token='+ this.tokens.access);

        this.primus.on('error', function(err) {

            console.error(err);
        });

        this.primus.on('open', function(data) {

            console.log('socket open', data);

            self.subscribe(callback);
        });

        this.primus.on('reconnect scheduled', function (opts) {

            //self.fire('reconnect-scheduled', opts, { bubbles: false });

            console.log('socket reconnect scheduled');

            self.refreshToken();

        });

        this.primus.on('data', function(info) {

            if (Array.isArray(info.data) &&
                info.data.length === 2 &&
                typeof info.data[0] === 'string') {

                //console.log('event', info.data[0], info.data[1]);

                self.events.emit(info.data[0], info.data[1], { bubbles: false });
            }
        });
    },

    refreshToken: function(callback){

        var self = this;

        var args = {data: {refresh: this.tokens.refresh}};

        this.getRefreshToken(args, function(data, response){

            self.tokens = data;

            if(callback){

                callback();
            }
        });
    },

    subscribe: function(callback){

        var self = this;

        self.primus.send('subscribe', { type: 'user', id: self.user.id }, function() {

            console.log('subscribed to user', self.user);

            if(callback) callback(undefined, self.user);
        });
    },

    login: function(callback){

        var self = this;

        var args = {
            data: { username: this.config.username, password: this.config.password},
            headers: this.headers
        };

        this.getToken(args, function(data, response){

            console.log('got token', data);

            if(data && data.access){

                self.tokens = data;

                self.getUser({}, function(user){

                    //console.log('user', user);

                    self.user = user;

                    self.strapPrimus(function(){

                        self.primus.send('whoami', function(data2) {

                            //console.log('socket says you are', data2.user);

                            self.user = data2.user;

                            if(callback) callback(undefined, self.user);

                            //self.subscribe(callback);

                        });
                    });
                });
            }
        });
    }
}



alteredClient.registerMethods();

module.exports = alteredClient;

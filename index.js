var Client = require('node-rest-client').Client;
var Socket = require('primus.io').createSocket({ transformer: 'sockjs' });

var EventEmitter = require('events').EventEmitter;
var util = require('util');

function MyEmitter() {
    EventEmitter.call(this);
}

util.inherits(MyEmitter, EventEmitter);

var alteredClient = function(config){

    var ret = {

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

                      callback(err);
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
            this.registerMethod('avatarFriends', 'avatar/friends/${id}', 'PUT');
            this.registerMethod('avatarAdversaries', 'avatar/adversaries/${id}', 'PUT');
        },

        addTokenHeader: function(){

            if(this.tokens && this.tokens.access){

                this.headers['Authorization'] = 'Bearer ' + this.tokens.access;
            }
        },

        strapPrimus: function(callback){

            //if primus has already been strapped, don't do it again
            if(this.primus && this.primus.strapped){

                console.log('primus is already strapped');

                if(callback){

                  callback();
                }

                return;
            }

            var self = this;

            console.log('strapping primus');

            this.primus = new Socket(this.config.api + '?token='+ this.tokens.access);

            this.primus.strapped = true;

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

                //self.reconnecting = true;

                /*self.refreshToken(function(){

                    //self.reconnecting = false;

                    //self.subscribe(callback);
                });*/


            });

            this.primus.on('data', function(info) {

                if (Array.isArray(info.data) &&
                    info.data.length === 2 &&
                    typeof info.data[0] === 'string') {

                    //console.log('event', info.data[0], info.data[1]);

                    self.events.emit(info.data[0], info.data[1], { bubbles: false });
                }
            });

            this.primus.on('disconnection', function (opts) {

                console.log('socket disconnection');
            });

            this.primus.on('close', function (opts) {

                console.log('socket close');
            });

            this.primus.on('heartbeat', function (opts) {

                console.log('socket heartbeat');
            });

            this.primus.on('offline', function (opts) {

                console.log('socket offline');
            });

            this.primus.on('outgoing::url', function (url) {

              // On reconnects, update the credentials
              if (self._latestAccessToken) {
                url.query = 'token=' + self._latestAccessToken;
                self._latestAccessToken = null;
              }
            });

            if(callback){

              callback();
            }

        },

        refreshToken: function(callback){

            var self = this;

            var args = {data: {refresh: this.tokens.refresh}};

            this.getRefreshToken(args, function(data, response){

                console.log('getRefreshToken', response);

                self.tokens = data;

                self._latestAccessToken = self.tokens.access;

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

                        console.log('user', user);

                        self.user = user;

                        self.strapPrimus(function(){

                            self.primus.send('whoami', function(data2) {

                                console.log('socket says you are', data2);

                                if(data2){

                                  self.user = data2.user;

                                  if(callback) callback(undefined, self.user);

                                }else{

                                  console.log('whoami failed, retrying login');

                                  self.login(callback);
                                }



                                //self.subscribe(callback);

                            });
                        });
                    });
                }
            });
        }
    };

    ret.registerMethods();

    return ret;
}


module.exports = alteredClient;

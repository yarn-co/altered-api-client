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

            self.client.methods[name](args, callback);

        };

        //method.name = name;

        return method;

    },

    registerMethod: function(name, route, method){

        this.client.registerMethod(name, this.config.api + route, method);

        this[name] = this.makeMethod(name);
    },


    registerMethods: function(){

        this.registerMethod('postToken', 'token', 'POST');
        this.registerMethod('getUser', 'user', 'GET');
    },

    addTokenHeader: function(){

        if(this.token){

            this.headers['Authorization'] = 'Bearer ' + this.token;
        }
    },


    strapPrimus: function(){

        var self = this;

        this.primus = new Socket(this.config.api + '?token='+ this.token);

        this.primus.on('error', function(err) {
            console.error(err);
        });

        this.primus.on('open', function(data) {

            console.log('socket open', data);
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

    login: function(callback){

        var self = this;

        var args = {
            data: { username: this.config.username, password: this.config.password},
            headers: this.headers
        };

        this.postToken(args, function(data, response){

            if(data && data.access){

                self.token = data.access;

                self.strapPrimus();

                self.getUser({}, function(user){

                    console.log('user', user);

                    self.primus.send('whoami', function(data2) {

                        console.log('socket says you are', data2);
                    });

                    self.primus.send('subscribe', { type: 'user', id: user.id }, function(data2) {

                        console.log('subscribed to user', data2);

                        if(callback) callback(undefined, user);
                    });
                });
            }
        });
    }
}



alteredClient.registerMethods();

module.exports = alteredClient;

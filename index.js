var Client = require('node-rest-client').Client;

var config = require('./config');

var alteredClient = {

    config: config,
    client: new Client(),
    token: undefined,
    tokenHeader: undefined,
    refreshToken: undefined,

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

    login: function(callback){

        var self = this;

        var args = {
            data: { username: this.config.username, password: this.config.password},
            headers: this.headers
        };

        this.postToken(args, function(data, response){

            if(data && data.access){

                self.token = data.access;

                if(callback) callback(undefined, data);
            }
        });

    }
}

alteredClient.registerMethods();

module.exports = alteredClient;

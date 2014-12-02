/**
 * Created by petarvlahu on 11/20/14.
 */
var assert = require('assert')
describe("A Client API for Looker", function(){
    var Client = null;
    beforeEach(function(){
        Client = require('../lib/looker-api').Client
    });

    it("a client should exist", function(){
        expect(Client).not.toBeNull();
    });


    describe("Client functionality", function(){
        var client = null;
        var token = "Mkz9GRYoIhyuJ898YG89Ig";
        var secret = "v1+MNxMg1vdmljYbtBhEDFEQSlAUEZd4xWd";
        var host = "https://demo.looker.com";

        beforeEach(function(){
            client = new Client({
                token:token,
                secret:secret,
                host:host
            });
        });

        it("should have token, secret and host", function(){
            expect(client.token).toEqual(token);
            expect(client.secret).toEqual(secret);
            expect(client.host).toEqual(host);
        });

        it("token, secret and host should be immutable", function(){
            client.token = client.secret = client.host = "jiberish";
            expect(client.token).toEqual(token);
            expect(client.secret).toEqual(secret);
            expect(client.host).toEqual(host);
        });


    });


    describe("Queries functionality", function() {
        var client = null;
        var token = "Mkz9GRYoIhyuJ898YG89Ig";
        var secret = "v1+MNxMg1vdmljYbtBhEDFEQSlAUEZd4xWd";
        var host = "https://demo.looker.com";

        var query = 'orders';
        var dict = 'thelook';
        var fields = ['orders.count', 'users.count'];
        var filters = {
            'users.state': '-%New%',
            'orders.created_date': '90 days'
        };
        var limit = 100;



        var options = {};

        beforeEach(function () {
            client = new Client({
                token: token,
                secret: secret,
                host: host
            });

            options = {};
            options['query'] = query;
            options['dictionary'] = dict;
            options['fields'] = fields;
            options['filters'] = filters;
            options['limit'] = limit;

        });

        it("should have all options set", function(){
            var q = new client.query(options);

            expect(q.query).toEqual(query);
            expect(q.dictionary).toEqual(dict);
            expect(q.fields).toEqual(fields);
            expect(q.filters).toEqual(filters);
            expect(q.limit).toEqual(limit);
        });

        it("should have defaults correctly initialized", function(){
            delete options.filters;
            delete options.limit;

            var q = new client.query(options);

            expect(q.query).toEqual(query);
            expect(q.dictionary).toEqual(dict);
            expect(q.fields).toEqual(fields);
            expect(q.filters).not.toBeDefined();
            expect(q.limit).not.toBeDefined();
        });

        it("should work without filters", function(){
            delete options.limit;
            var q = new client.query(options);

            expect(q.query).toEqual(query);
            expect(q.dictionary).toEqual(dict);
            expect(q.fields).toEqual(fields);
            expect(q.filters).toEqual(filters);
            var res = q.run().then(function(d){
                expect(d.data).toBeDefined()
            });

        });

        it('should fail if fields is empty array', function(){
            delete options.fields;
            expect(function(){new client.query(options)}).toThrow();

        });

        it('should fail if filters is not an array', function(){
            options.fields = 1;
            expect(function(){new client.query(options)}).toThrow();
        });

        it('should fail if limit is NaN or less than 0', function(){
            options.limit = 'skjdhf';
            expect(function(){new client.query(options)}).toThrow();

            options.limit = -1;
            expect(function(){new client.query(options)}).toThrow();

        });

        it('should fail if ran without query or dict', function(){
            delete options.query;
            expect(function(){new client.query(options)}).toThrow();
            options.query = '';
            expect(function(){new client.query(options)}).toThrow();
            options.query = 1;
            expect(function(){new client.query(options)}).toThrow();
            options.query = new Date();
            expect(function(){new client.query(options)}).toThrow();

            delete options.dictionary;
            expect(function(){new client.query(options)}).toThrow();
            options.dictionary = '';
            expect(function(){new client.query(options)}).toThrow();
            options.dictionary = 1;
            expect(function(){new client.query(options)}).toThrow();
            options.dictionary = new Date();
            expect(function(){new client.query(options)}).toThrow();
        });

        it('should return data in specified format', function(){
            var df = ['value','rendered','html'];
            options.data_formats = df;
            var q = new client.query(options);
            q.run().then(function(res){
                var d = JSON.parse(res);
                for (var i = 0; i < d.data.length; i++) {
                    expect(d.data[i][df[0]]).toBeDefined();
                    expect(d.data[i][df[1]]).toBeDefined();
                    expect(d.data[i][df[2]]).toBeDefined();
                }
            });
        });

        it('should fail for invalid format', function(){
            var df = ['value','renddered','html'];
            options.data_formats = df;
            expect(function(){new client.query(options)}).toThrow();
        });

        it('should return fields data in specified format', function(){
            var fd = ['label','name','type'];
            options.field_data = fd;

            var q = new client.query(options);
            q.run().then(function(res){
                var d = JSON.parse(res);
                for (var i = 0; i < d.data.length; i++) {
                    expect(d.fields[i][fd[0]]).toBeDefined();
                    expect(d.fields[i][fd[1]]).toBeDefined();
                    expect(d.fields[i][fd[2]]).toBeDefined();
                }
            });
        });

        it('should fail for invalid field data format', function(){
            var df = ['label','name','typee'];
            options.field_data = df;
            expect(function(){new client.query(options)}).toThrow();
        });

        it('should sort', function(){
            options.sort = options.fields.join(',');

            var q = new client.query(options);
            q.run().then(function(res){
                var d = JSON.parse(res);
                expect(d.data).toBeDefined()
            });

            options.sort = options.fields.reverse().join(',');

            var q = new client.query(options);
            q.run().then(function(res){
                var d = JSON.parse(res);
                expect(d.data).toBeDefined()
            });

            options.sort = 'orders.count desc';

            var q = new client.query(options);
            q.run().then(function(res){
                var d = JSON.parse(res);
                expect(d.data).toBeDefined()
            });

            options.sort = 'units.count desc';

            var q = new client.query(options);
            q.run().then(function(res){
                var d = JSON.parse(res);
                expect(d.data).toBeDefined()
            });
        })
    });
});
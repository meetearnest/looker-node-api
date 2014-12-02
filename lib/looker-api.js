/**
 * Created by petarvlahu on 11/13/14.
 */

var util = require('util'),
    format =util.format,
    https  = require('https'),
    http   = require('http'),
    url    = require('url'),
    _      = require('lodash'),
    qs     = require('querystring'),
    crypto = require('crypto'),
    assert = require('assert'),
    Promise= require('bluebird'),
    log    = require('bunyan').createLogger({name:"Client"});

function Client(options) {
    var me = {
        query: function(options){
            return new Query({
                credentials :me,
                query       :options.query,
                dictionary  :options.dictionary,
                data_formats:options.data_formats,
                fields      :options.fields,
                field_data  :options.field_data,
                filters     :options.filters,
                limit       :options.limit,
                sorts       :options.sorts
            });
        }
    };

    Object.defineProperties(me, {
        token: {
            get: function(){return options.token;}
        },
        secret: {
            get: function(){return options.secret;}
        },
        host: {
            get: function(){return options.host;}
        }
    });

    return me;
}


function Query(options) {
    var me = {};
    validateParams(options);
    Object.defineProperties(me, {
        credentials: {
            get: function(){return options.credentials;}
        },
        query: {
            get: function(){return options.query;}
        },
        dictionary: {
            get: function (){return options.dictionary;}
        },
        fields: {
            get: function(){return options.fields;}
        },
        filters: {
            get: function(){return options.filters;}
        },
        limit: {
            get: function(){return options.limit;}
        },
        method: {
            get: function(){return "GET";}
        },
        field_data: {
            get: function(){return options.field_data;}
        },
        data_formats: {
            get: function(){return options.data_formats;}
        },
        sorts: {
            get: function(){return options.sorts;}
        }
    });

    me.run = run;
    me.queryParams = queryParams;
    me.getHeaders = getHeaders;
    me.generateStringToSign = generateStringToSign;
    return me;
}

var validFieldData      = ['label', 'name', 'type'];
var validDataFormats    = ['value', 'rendered', 'html'];
var validSort           = /^\w+(?: (?:a|de)sc)?(?:,\w+(?: (?:a|de)sc)?)*$/;


function validateParams(q){
    assert.ok(util.isArray(q.fields), "fields must be an Array");
    assert.ok(q.fields.length > 0 , "at least one field must be specified");

    if (typeof q.limit !== "undefined" ) {
        assert.ok(!isNaN(q.limit * 1), "limit must be a Number");
        assert.ok((q.limit * 1) > -1, "limit must be greater or equal to 0");
    }

    assert.ok(typeof q.dictionary === "string", "dictionary must be String");
    assert.ok(q.dictionary.length > 0, "dictionary must not be empty String");

    assert.ok(typeof q.query === "string", "query must be String");
    assert.ok(q.query.length > 0, "query must not be empty String");

    if (typeof q.field_data !== "undefined") {
        assert.ok(util.isArray(q.field_data), "field data must be an Array");
        for (var i = 0; i < q.field_data.length; i++)
            assert.ok(validFieldData.indexOf(q.field_data[i])>-1,
                "invalid field data; valid fields are: " + validFieldData);
    }

    if (typeof q.data_formats !== "undefined") {
        assert.ok(util.isArray(q.data_formats), "data formats must be an Array");
        for (var i = 0; i < q.data_formats.length; i++)
            assert.ok(validDataFormats.indexOf(q.data_formats[i])>-1,
                "invalid data format; valid formats are: " + validDataFormats);
    }

    if (typeof q.sorts !== "undefined") {
        assert.ok(typeof q.sorts === "string", "sorts must be a String");
        assert.ok(q.sorts.length > 0, "sorts must not be empty");
        assert.ok(validSort.test(q.sorts), "sorts is not valid");
    }
}

function run(){
    var uri = format("/api/dictionaries/%s/queries/%s",
        this.dictionary, this.query);

    var _url = url.parse(this.credentials.host);

    var protocol = (_url.protocol === 'https:')?https:http;

    var port = _url.port;

    var options = {
        host: _url.host,
        path: uri+"?"+this.queryParams(),
        method: this.method,
        headers: this.getHeaders(uri),
        rejectUnauthorized: false
    };

    if (port != null)
        options.port = port;

    log.debug(options);

    return new Promise(function(resolve, reject) {
        var req = protocol.request(options, function(res){
            log.debug('STATUS: ' + res.statusCode);
            log.debug('HEADERS: ' + JSON.stringify(res.headers));
            res.setEncoding('utf8');

            var resp = '';

            res.on('data', function (chunk) {
                resp += chunk;
            });

            res.on('end', function () {
                resolve(resp);
            });
        });

        req.on('error', function(e){
            log.debug('problem with request: ' + e.message);
            reject(e);
        });

        req.end();
    });

};

function queryParams(){
    var fields = _.map(this.fields, function(f){return f.toLowerCase()}).join();
    var filters = [];
    _(this.filters).forEach(function(v, k){
        filters.push(format("f[%s]=%s",
            k.toLowerCase(),
            qs.escape(v)));
    });
    var resp = [];

    if (this.data_formats && this.data_formats.length > 0)
        resp.push("data_formats="+this.data_formats.join(","));

    if (filters.length > 0)
        resp.push(filters.sort().join("&"));
    if (this.field_data && this.field_data.length > 0)
        resp.push("field_data="+this.field_data.join(","));
    resp.push("fields="+fields);
    if (!isNaN(this.limit * 1))
        resp.push("limit="+(this.limit*1));
    if (this.sorts && this.sorts.length > 0)
        resp.push("sorts="+this.sorts.join(","));

    var res = resp.join("&");

    return res;
};

function getHeaders(uri){
    var now = new Date().toString();
    var nonce = crypto.randomBytes(16).toString('hex').slice(0,32);
    var stringToSign = this.generateStringToSign(uri, now, nonce);
    var hmac = crypto.createHmac('sha1', this.credentials.secret);
    log.debug(stringToSign);
    hmac.setEncoding('base64');
    hmac.write(stringToSign);
    hmac.end();
    var signature = hmac.read();
    return {
        "Authorization": this.credentials.token + ':' + signature,
        "Date": now,
        "x-llooker-nonce": nonce,
        "Accept": "application/json"
    }
};

function generateStringToSign(uri, now, nonce){
    var fields = [this.method, uri, now, nonce, this.queryParams().replace(/\&/g, "\n")];
    return fields.join("\n")+"\n";
};

exports.Client = Client;

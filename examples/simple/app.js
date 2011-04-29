var express = require('express'),
    expressDust = require('../../lib/express-dust');

// create a new express application
var app = module.exports = express.createServer();

app.set('APP_PORT', 3000);

// register the application
expressDust.register(app);

// set global view variables
app.set('view options', {
    SITE_URL: 'http://localhost:' + app.set('APP_PORT') + '/',
    SITE_TITLE: 'Simple example'
});

// set helper methods
app.helpers({
    hello: function (chunk, context, bodies, params) {
        var name = (params && params.name) ? params.name : '';
        return chunk.write('Hello ' + name + '!');
    }
});


// set dynamicHelpers
app.dynamicHelpers({
    contentType: function(req, res) {
        return req.headers.accept && req.headers.accept.indexOf('application/xhtml+xml') != -1 ? 'application/xhtml+xml' : 'text/html';
    }
});


// setup router middleware
app.use(app.router);
app.get('/', function (req, res, next) {
    res.render('index');
});
app.get('/sayhello', function (req, res, next) {
    res.render('index', { name: req.param('name') });
});

// Only listen on $ node app.js
if (!module.parent) {
    app.listen(app.set('APP_PORT'));
    console.log("Express server listening on port %d", app.address().port)
}

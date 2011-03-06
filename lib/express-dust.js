/**
 * Module dependencies.
 */
var fs = require('fs'),
    dust = require('dust');
    http = require('http'),
    res = http.ServerResponse.prototype;

function render(file, context, next) {
    if (false === context.get('__cache')) {
        dust.onLoad(file, function(err, src) {
            if (err) next(err);
            else {
                dust.renderSource(src, context, next);
            }
        });
    } else {
        dust.render(file, context, next);
    }
};

res.render = function(view, opts, fn) {
    // support callback function as second arg
    if (typeof opts === 'function') {
        fn = opts, opts = null;
    }
    var self = this,
        app = this.app,
        helpers = app.viewHelpers,
        dynamicHelpers = app.dynamicViewHelpers,
        engine = app.set('view engine') || 'dust',
        viewOptions = app.set('view options'),
        props  = {};

    props.__cache = app.set('cache views');
    props.__dirname = (app.set('views') || process.cwd() + '/views');
    props.__filename = view + (view.indexOf('.') > -1 ? '' : '.' + engine);

    var context = dust.makeBase(opts || {})
                    .push(viewOptions)
                    .push(props)
                    .push(helpers);
    // Dynamic helper support
    if (false !== context.get('dynamicHelpers')) {
        // cache
        if (!this.__dynamicHelpers) {
            this.__dynamicHelpers = {};
            for (var key in dynamicHelpers) {
                this.__dynamicHelpers[key] = dynamicHelpers[key].call(
                    this.app,
                    this.req,
                    this);
            }
        }
        context = context.push(this.__dynamicHelpers);
    }

    render(view, context, function (err, out) {
        if (fn) fn(err, out);
        else {
            if (err) self.req.next(err);
            else self.send(out);
        }
    });
};

module.exports = {
    render: function(view, context, next) {
        render(view, dust.makeBase(context), next);
    },
    //disable whitespace compression
    disableCompression: function() {
        dust.optimizers.format = function(ctx, node) { return node };
    },
    register: function(app) {
        dust.onLoad = function(view, next) {
            fs.readFile(
                (app.set('views') || process.cwd() + '/views') + '/' + view + 
                (view.indexOf('.') > -1 ? '' : '.' + (app.set('view engine') || 'dust')),
                'utf8', next
            );
        }
    }
}

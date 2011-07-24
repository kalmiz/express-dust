/**
 * Module dependencies.
 */
var fs = require('fs'),
    dust = require('dust');
    http = require('http'),
    res = http.ServerResponse.prototype;

// version information
var version = '0.0.2';

// Dust renderer wrapper.
//
// if __cache is false in context, render without cache, otherwise use the
// standard dust.render() method.
// You can set __cache via app.set():
// app.set('__cache', false) // do not use cache, useful under development.
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

// Override the original express render method
res.render = function(view, opts, fn) {
    // support callback function as second arg
    if (typeof opts === 'function') {
        fn = opts, opts = null;
    }
    var self = this,
        app = this.app,
        helpers = app._locals,
        locals = this.locals(),
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
                    .push(helpers)
                    .push(locals);

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

function readDir(compiled, root, ext, prefix) {
    var dir = (prefix) ? root + '/' + prefix : root,
        templates = fs.readdirSync(dir),
        re = new RegExp("\\." + ext + "$");

    templates.forEach(function(filename) {
        if (re.test(filename)) {
            var name = filename.substr(0, filename.lastIndexOf('.'));
            var index = (prefix ? prefix + '/' + name : name);
            compiled[index] = dust.compile(fs.readFileSync(dir + '/' + filename, 'utf8'), index);
        }
    });
};

function readLibs(list) {
    var retval = '';
    list.forEach(function(e) {
        retval +=  (e.substr(0, 1) == '/') ? fs.readFileSync(e, 'utf8') : fs.readFileSync(process.cwd() + '/' + e, 'utf8' );
    });
    return retval;
};

module.exports = {
    version: version,
    compileTemplates: function(app) {
        var root                = (app.set('views') || process.cwd() + '/views'),
            clientTemplates     = app.set('view client templates') || [],
            clientLibs          = app.set('view client libs') || [],
            clientCache         = app.set('view client cache') || false;
            clientCacheContent  = clientCache ? readLibs(clientLibs) : '',
            compiled            = {};
            
        readDir(compiled, root, app.set('view engine') || 'dust');
        readDir(compiled, root, app.set('view engine') || 'dust', 'partials');
        Object.keys(compiled).forEach(function(e) {
            if (clientCache && clientTemplates.indexOf(e) != -1) {
                clientCacheContent += compiled[e];
            }
            dust.loadSource(compiled[e]);
        });
        if (clientCache) {
            fs.writeFileSync(clientCache.substr(0,1) == '/' ? clientCache : process.cwd() + '/' + clientCache, clientCacheContent, 'utf8');
        }
        delete compiled;
    },
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

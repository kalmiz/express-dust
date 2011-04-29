Express-dust
============

Express view engine adapter for Dust template engine.

Usage
=====

Express-dust is overwrite the express's original render method because that
doesn't support async tempate engines like dustjs. You just require
express-dust module and call the response object's render method.

In your app.js:

    var expressDust = require('express-dust');

In your handler:

    //render the views/user.dust
    res.render('user', {title: 'User account', user: user });

You can use all of express's view settings. For example: app.set("view options",{...}) and app.dynamicHelpers({...}), etc.

Limitations
===========

 - No layout support in render method.
   If you want to layouts, you have to use dustjs base - child template system.

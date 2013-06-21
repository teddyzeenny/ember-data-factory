import { Adapter, EmberDataAdapter } from "./factory/adapters";

var Factory = {};
var definitions = {};

/**
  @public

  Used to define factories
  You can also pass in
  attributes of related records

  Example:
  ```javascript
  Factory.define('post', {
    title: 'Post Title',
    body: 'Post body',
    author: {
      name: 'Teddy'
    }
  });
  ```

  @method define
  @param {String} name
  @param {Object} props
  @param {Object} options (optional)
    Possible options:
      {String} modelName: The name of the model, ex: 'Post'
*/
Factory.define = function(name, props, options) {
  definitions[name] = {
    props: props
  };
  var defaultOptions = {
    modelName: classify(name)
  };
  options = merge(defaultOptions, options);
  definitions[name] = merge(definitions[name], options);
};

/**
 @public

 Returns a singleton
 of the attributes of
 a defined factory

 @method attr
 @param {Ember.Application}
 @param {String} name
 @param {Object} props
 @return {Object}
*/
Factory.attr = function(app, name, props) {
  var obj;
  props = props || {};
  props = toAttr(app, props);
  obj = merge(definitions[name].props, props);
  obj = toAttr(app, obj);
  return obj;
};

/**
 @public

 Creates but does not commit
 a record and all related records
 if any were defined

 @method build
 @param {Ember.Application} app
 @param {String} app
 @param {Object} props
 @return {Promise}
 */
Factory.build = function(app, name, props) {
  var promise;
  Ember.run(function() {
    promise = generate(app, name, props);
  });
  return promise;
};


/**
  @public

  Creates and commits a record
  and all related records
  if any were defined

  @method create
  @param {Ember.Application} app
  @param {String} name
  @param {Object} props
  @return {Promise}
 */
Factory.create = function(app, name, props) {
  var promise;
  Ember.run(function() {
    promise = generate(app, name, props, { commit: true });
  });
  return promise;
};

/**
  @public

  Clears all factory definitions

  @method reset
 */
Factory.reset = function() {
  definitions = {};
};


Factory.Adapter = Adapter;
Factory.EmberDataAdapter = EmberDataAdapter;


// This can probably be written
// in a cleaner way
// Mainly ED bugs made it ugly
// Will definitely become cleaner with time
function generate(app, name, props, options) {

  var key, model, attrObject, record,
      attr = {}, belongsToRecords = {},
      savePromise, belongsToPromises = [],
      belongsToKeys = [];

  options = options || {};
  var commit = options.commit || false;
  var definition = definitions[name];

  attrObject = Factory.attr(app, name, props);
  model = app[definition.modelName];


  for (key in attrObject) {
    var val = attrObject[key];
    if(isBelongsTo(model, key)) {
      var belongsToModelClass = Factory.adapter.belongsToModelClass(model, key);
      if(!isRecord(val)) {
        belongsToKeys.push(key);
        belongsToPromises.push(generateParent(key, app, modelClassName(belongsToModelClass), val, { commit: commit } ));
      } else {
        if(commit) {
          Factory.adapter.save(app, val);
        }
        belongsToRecords[key] = val;
      }
    }
    else {
      attr[key] = val;
    }
  }


  function generateParent(k, app, name, val, options) {
    return generate(app, name, val, { commit: commit } );
  }

  function commitRecord(parentRecords) {
    var defer = Em.RSVP.defer(), i, allBelongsToRecords = [];

    record = model.createRecord(attr);
    // set newly created parents
    for (i = 0; i < parentRecords.length; i++) {
      record.set(belongsToKeys[i], parentRecords[i]);
      allBelongsToRecords.push(parentRecords[i]);
    }
    // set already created parents
    for (var k in belongsToRecords) {
      record.set(k, belongsToRecords[k]);
      allBelongsToRecords.push(belongsToRecords[k]);
    }

    if(commit) {
      defer.resolve(Factory.adapter.save(app, record, allBelongsToRecords));

    } else {
      // avoid autorun
      Em.run.next(function() {
        defer.resolve(record);
      });

    }

    return defer.promise;
  }


  return Ember.RSVP.all(belongsToPromises).then(commitRecord);
}



// Expose ember-testing Helpers

function attr(app, name, props) {
  return Factory.attr(app, name, props);
}

function build(app, name, props) {
  return app.testHelpers.wait(Factory.build(app, name, props));
}

function create(app, name, props) {
  return app.testHelpers.wait(Factory.create(app, name, props));
}

var helper = Ember.Test.registerHelper;

helper('attr', attr);
helper('build', build);
helper('create', create);



// Utility methods used above

function toAttr(app, obj) {
  var newObj = {};
  for(var i in obj) {
    if (typeof obj[i] === 'function') {
      newObj[i] = obj[i](app);
    } else {
      newObj[i] = obj[i];
    }
  }
  return newObj;
}


function isRecord(val) {
  return Factory.adapter.isRecord(val);
}

function isBelongsTo(modelClass, key) {
  return Factory.adapter.isBelongsTo(modelClass, key);
}

function isArray(val) {
  return toString.call(val) === "[object Array]";
}

function modelClassName(modelClass) {
  return Factory.adapter.modelClassName(modelClass);
}

function classify(text) {
  return Ember.String.classify(text);
}

function merge(firstObject, secondObject) {
  return Em.$.extend(true, {}, firstObject, secondObject);
}

Factory.adapter = Factory.EmberDataAdapter.create();

export = Factory;

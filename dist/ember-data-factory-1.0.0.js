(function(globals) {
var define, requireModule;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requireModule = function(name) {
    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    var mod = registry[name];
    if (!mod) {
      throw new Error("Module '" + name + "' not found.");
    }

    var deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(deps[i]));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;
  };
})();

define("factory/adapters",
  ["exports"],
  function(__exports__) {
    "use strict";
    var Adapter = Ember.Object.extend({
      /**
       Checks whether a given value
       is a record instance.

       @method isRecord
       @param {mixed} val
       @return {Boolean}
      */
      isRecord: function(val) { return false; },

      /**
       Checks whether a given
       property represents
       a `belongsTo` relationship

       @method isBelongsTo
       @param {Object} modelClass
       @param {String} key
       @return {Boolean}
      */
      isBelongsTo: function(modelClass, key) { return false; },

      /**
       Retuns the model class
       of a `belongsTo` relationship

       @method belongsToModelClass
       @param {Object} modelClass
       @param {String} key
       @return {Object}
      */
      belongsToModelClass: function(modelClass, key) {},

      /**
       Returns the name of a model class

       @method typeName
       @param {Object} modelClass
       @return {String}
      */
      typeName: function(modelClass) {
        var parts = modelClass.toString().split(".");
        return Em.String.camelize(parts[parts.length - 1]);
      },

      /**
       Returns the model type class given a name

       @method modelFor
       @param {Ember.Application} app
       @param {string} modelName
       @return {Object}
      */
      modelFor: function(app, modelName) {
        return app[Ember.String.classify(modelName)];
      },

      /**
       Creates a record without saving

       @method createRecord
       @param {Ember.Application} app
       @param {string} modelName
       @param {Object} the record's attributes
       @return {Object}
      */
      createRecord: function(app, modelName, attr) {
        return this.modelFor(app, modelName).createRecord(attr);
      },

      /**
       Commits a given record
       to persistence.  Returns
       a promise that resolves
       when the record persists.

       @method save
       @param {Ember.Application} app
       @param {Object} record
       @param {Array} parentRecords
       @return {Promise}
      */
      save: function(app, record, parentRecords){}

    });


    var EmberDataAdapter = Adapter.extend({

      modelFor: function(app, modelName) {
        return app.__container__.lookup('store:main').modelFor(modelName);
      },

      typeName: function(modelClass) {
        return Ember.String.camelize(modelClass.typeKey);
      },

      isRecord: function(val) {
        return val instanceof DS.Model;
      },

      isBelongsTo: function(modelClass, key) {
        var meta = modelClass.metaForProperty(key);
        return meta.isRelationship && meta.kind === 'belongsTo';
      },

      belongsToModelClass: function(app, modelClass, key) {
        var meta = modelClass.metaForProperty(key);
        var type = meta.type;
        if (Ember.typeOf(type) === 'string') {
          type = this.modelFor(app, type);
        }
        return type;
      },

      createRecord: function(app, modelName, attr) {
        return app.__container__.lookup('store:main').createRecord(modelName, attr);
      },

      save: function(app, record, parentRecords) {
        var i, transaction = [];
        parentRecords = parentRecords || [];
        return Ember.RSVP.resolve(record.save());
      }
    });


    __exports__.Adapter = Adapter;
    __exports__.EmberDataAdapter = EmberDataAdapter;
  });
define("factory",
  ["factory/adapters"],
  function(__dependency1__) {
    "use strict";
    var Adapter = __dependency1__.Adapter;
    var EmberDataAdapter = __dependency1__.EmberDataAdapter;

    var Factory = Ember.Namespace.extend(Ember.Evented).create();
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
        modelName: Ember.String.camelize(name)
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
      var event = { app: app, name: name, attr: props },
          promise, self = this;

      Ember.run(function() {
        self.trigger('beforeBuild', event);
        promise = generate(app, name, props).then(function(record) {
          event.record = record;
          self.trigger('afterBuild', event);
          return record;
        });
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
      var event = { app: app, name: name, attr: props },
          promise, self = this;

      Ember.run(function() {
        self.trigger('beforeCreate', event);
        promise = generate(app, name, props, { commit: true }).then(function(record) {
          event.record = record;
          self.trigger('afterCreate', event);
          return record;
        });
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
      model = modelClass(app, definition.modelName);

      for (key in attrObject) {
        var val = attrObject[key];
        if(val && isBelongsTo(model, key)) {
          var belongsToModelClass = Factory.adapter.belongsToModelClass(app, model, key);
          if(!isRecord(val)) {
            belongsToKeys.push(key);
            belongsToPromises.push(generateParent(key, app, typeName(belongsToModelClass), val, { commit: commit } ));
          } else {
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

        record = createRecord(app, definition.modelName, attr);
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

    if (Ember.Test.registerAsyncHelper) {
      helper = Ember.Test.registerAsyncHelper;
    }

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

    function typeName(modelClass) {
      return Factory.adapter.typeName(modelClass);
    }


    function modelClass(app, modelName) {
      return Factory.adapter.modelFor(app, modelName);
    }

    function createRecord(app, modelName, attr) {
      return Factory.adapter.createRecord(app, modelName, attr);
    }

    function merge(firstObject, secondObject) {
      return Em.$.extend(true, {}, firstObject, secondObject);
    }

    Factory.adapter = Factory.EmberDataAdapter.create();


    return Factory;
  });
window.Factory = requireModule("factory");
})(window);
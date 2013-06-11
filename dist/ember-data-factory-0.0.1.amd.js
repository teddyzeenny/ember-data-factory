define("factory",
  [],
  function() {
    "use strict";

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
      return generate(app, name, props);
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
      return generate(app, name, props, { commit: true });
    };

    /**
      @public

      Clears all factory definitions

      @method reset
     */
    Factory.reset = function() {
      definitions = {};
    };


    // This can probably be written
    // in a cleaner way
    // Mainly ED bugs made it ugly
    // Will definitely become cleaner with time
    function generate(app, name, props, options) {
      var defer = Em.RSVP.defer();
      var countWaiting = 0;

      var key, model, attrObject, record,
          attr = {}, belongsToRecords = {}, hasManyRecords = {},
          transaction, relatedRecord;

      options = options || {};
      var commit = options.commit || false;
      transaction = newTransaction(app);
      var relatedTransaction = newTransaction(app);

      var definition = definitions[name];

      attrObject = Factory.attr(app, name, props);
      model = app[definition.modelName];



      for (key in attrObject) {
        var val = attrObject[key];
        var meta = model.metaForProperty(key);
        if(isBelongsTo(meta)) {
          if(!isRecord(val)) {
            countWaiting++;
            generateParent(key, app, typeToName(meta.type), val, { commit: commit } );
          } else {
            relatedRecord = val;
            if(commit) {
              newTransaction(app).add(relatedRecord);
              Em.run(relatedRecord.get('transaction'), 'commit');
              if(!relatedRecord.get('isDirty')) {
                relatedTransaction.add(relatedRecord);
              }
            }
            belongsToRecords[key] = relatedRecord;
          }

        }
        // else if(isHasMany(meta) && isArray(val)) {
        //   var records = Em.A();
        //   for (var i = 0; i < val.length; i++) {
        //     if(!isRecord(val[i])) {
        //       relatedRecord = generate(app, typeToName(meta.type), val[i], { commit: commit } );
        //     } else {
        //       relatedRecord = val[i];
        //       if(commit) {
        //         newTransaction(app).add(relatedRecord);
        //         Em.run(function() {
        //           relatedRecord.get('transaction').commit();
        //         });
        //       }
        //     }
        //     records.pushObject(relatedRecord);
        //   }
        //   hasManyRecords[key] = records;
        // }
        else {
          attr[key] = val;
        }
      }
      checkComplete();

      function generateParent(k, app, name, val, options) {
        generate(app, typeToName(meta.type), val, { commit: commit } )
        .then(function(currentRecord) {
          countWaiting--;
          belongsToRecords[k] = currentRecord;
          relatedTransaction.add(currentRecord);
          checkComplete();
        });
      }

      function checkComplete() {
        if(countWaiting !== 0) {
          return;
        }
        Em.run(function() {
          record = model.createRecord(attr);
          record.setProperties(belongsToRecords);
          // for(var key in hasManyRecords) {
          //   record.get(key).pushObjects(hasManyRecords[key]);
          // }
          if(commit) {
            record.one('didCreate', function() {
              Em.run(function() {
                relatedTransaction.commit();
              }); // fixture adapter dirties the parent
              // avoid autorun
              Em.run.next(function() {
                defer.resolve(record);
              });
            });
            transaction.add(record);
            transaction.commit();
          } else {
            // avoid autorun
            Em.run.next(function() {
              defer.resolve(record);
            });

          }

        });
      }

      return defer.promise;
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

    function newTransaction(app) {
      return app.__container__.lookup('store:main').transaction();
    }

    function isBelongsTo(meta) {
      return meta.isRelationship && meta.kind === 'belongsTo';
    }

    function isHasMany(meta) {
     return meta.isRelationship && meta.kind === 'hasMany';
    }

    function isArray(val) {
      return toString.call(val) === "[object Array]";
    }

    function isRecord(val) {
      return val instanceof DS.Model;
    }

    function typeToName(type) {
      var parts = type.toString().split(".");
      return Em.String.camelize(parts[parts.length - 1]);
    }

    function classify(text) {
      return Ember.String.classify(text);
    }

    function merge(firstObject, secondObject) {
      return Em.$.extend(true, {}, firstObject, secondObject);
    }


    return Factory;
  });
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

   @method modelClassName
   @param {Object} modelClass
   @return {String}
  */
  modelClassName: function(modelClass) {
    var parts = modelClass.toString().split(".");
    return Em.String.camelize(parts[parts.length - 1]);
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
  isRecord: function(val) {
    return val instanceof DS.Model;
  },

  isBelongsTo: function(modelClass, key) {
    var meta = modelClass.metaForProperty(key);
    return meta.isRelationship && meta.kind === 'belongsTo';
  },

  belongsToModelClass: function(modelClass, key) {
    var meta = modelClass.metaForProperty(key);
    return meta.type;
  },

  save: function(app, record, parentRecords) {
    var i, transaction = app.__container__.lookup('store:main').transaction();
    parentRecords = parentRecords || [];
    return Ember.RSVP.Promise(function(resolve) {
      record.one('didCreate', function() {
        Em.run.next(function() {
          resolve(record);
        });
      });

      for(i = 0; i < parentRecords.length; i++) {
        transaction.add(parentRecords[i]);
      }
      transaction.add(record);
      transaction.commit();
    });
  }
});

export { Adapter, EmberDataAdapter };

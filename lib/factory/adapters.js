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

export { Adapter, EmberDataAdapter };

var App;

function buildApp() {
  Em.run(function() {
    App = window.App = Em.Application.create();
  });

  App.ApplicationStore = DS.Store.extend({
    adapter: DS.FixtureAdapter.extend()
  });

  App.Post = DS.Model.extend({
    title: DS.attr('string'),
    body: DS.attr('string'),
    comments: DS.hasMany('comment'),
    author: DS.belongsTo('author')
  });

  App.Post.FIXTURES = [];

  App.Comment = DS.Model.extend({
    title: DS.attr('string'),
    text: DS.attr('string'),
    post: DS.belongsTo('post')
  });

  App.Comment.FIXTURES = [];

  App.Author = DS.Model.extend({
    name: DS.attr('string'),
    posts: DS.hasMany('post'),
    jobs: DS.hasMany('job', {async: true})
  });

  App.Author.FIXTURES = [];

  App.Job = DS.Model.extend({
    name: DS.attr('string'),
    author: DS.belongsTo('author')
  });

  App.Job.FIXTURES = [];

  App.setupForTesting();
}

Ember.testing = true;
buildApp();

module("Factory", {
  setup: function() {
    App.reset();
    App.injectTestHelpers();
  },
  teardown: function() {
    App.removeTestHelpers();
    Factory.reset();

    App.Author.FIXTURES = [];
    App.Post.FIXTURES = [];
    App.Comment.FIXTURES = [];
  }
});

test("Single level Factory#attr", function() {
  var attributes = {};

  Factory.define('post', {
    title: 'post title',
    body: 'post body'
  });

  attributes = attr('post');
  deepEqual(attributes, { title: 'post title', body: 'post body'} );

  attributes = attr('post', { title: 'custom title'} );
  deepEqual(attributes, { title: 'custom title', body: 'post body' } );

});

test("Single level Factory#build", function() {
  expect(7);

  Factory.define('post', {
    title: 'post title',
    body: 'post body'
  });

  build('post').then(function(record) {
    equal(record.get('title'), 'post title');
    equal(record.get('body'), 'post body');
    ok(record instanceof App.Post);
    ok(record.get('isNew'));
  });


  build('post', { title: 'Custom title' } ).then(function(record) {
    equal(record.get('title'), 'Custom title');
    equal(record.get('body'), 'post body');
    ok(record.get('isNew'));
  })


});

test("Single level Factory#create", function() {
  expect(7);

  Factory.define('post', {
    title: 'post title',
    body: 'post body'
  });

  create('post').then(function(record) {
    equal(record.get('title'), 'post title');
    equal(record.get('body'), 'post body');
    ok(record instanceof App.Post);
    ok(!record.get('isNew'));
  });


  create('post', { title: 'Custom title' } ).then(function(record) {
    equal(record.get('title'), 'Custom title');
    equal(record.get('body'), 'post body');
    ok(!record.get('isNew'));
  });

});

test("Can set belongsTo relationship attributes", function() {
  expect(6);

  Factory.define('author', {
    name: 'Teddy'
  });

  Factory.define('post', {
    author: {}
  });

  build('post').then(function(post) {
    ok(post.get('author') instanceof App.Author);
    equal(post.get('author.name'), 'Teddy');
    ok(post.get('author.isNew'));
  });


  build('post', {
    author: {
      name: 'Zini'
    }
  })
  .then(function(post) {
    ok(post.get('author') instanceof App.Author);
    equal(post.get('author.name'), 'Zini');
  });

  create('post').then(function(post) {
    ok(!post.get('author.isNew'));
  });

});

test("Can set belongsTo relationship with async hasMany", function() {
  expect(2);

  Factory.define('author', {
    name: 'Zini'
  });

  Factory.define('job', {
    name: 'EmberDataFactory',
    author: {}
  });

  create('author').then(function(author) {
    create('job', {author: author}).then(function(job) {
      equal(job.get('author.name'), 'Zini');
      author.get('jobs').then(function(jobs) {
        equal(jobs.get('length'), 1);
      });
    });
  });
});

test("3 Level belongsTo relationship attributes", function() {

  Factory.define('author', {
    name: 'Teddy'
  });

  Factory.define('post', {
    title: 'Post title',
    author: {}
  });

  Factory.define('comment', {
    post: {}
  });

  create('comment', {
    post: {
      body: 'Post body',
      author: {
        name: 'Zini'
      }
    }
  }).then(function(comment) {

    ok(comment instanceof App.Comment);
    ok(comment.get('post') instanceof App.Post);
    ok(comment.get('post.author') instanceof App.Author);

    equal(comment.get('post.title'), 'Post title');
    equal(comment.get('post.body'), 'Post body');
    equal(comment.get('post.author.name'), 'Zini');
    ok(!comment.get('post.isDirty'));
    ok(!comment.get('post.comment.isDirty'));
  });

});

test("We can pass model instances as attributes", function() {
  expect(1);

  var author;

  Factory.define('author', {
    name: 'Teddy'
  });

  Factory.define('post', {
    title: 'Post title',
    author: {}
  });

  create('author').then(function(record) {
    author = record;
  }).then(function() {
    return create('post', {
      author: author
    });
  }).then(function(post) {
    ok(post.get('author') === author);
  });

});

test("Can use functions as attributes", function() {
  expect(2);

  Factory.define('post', {
    title: function(app) {
      ok(app === App);
      return 'Teddy';
    }
  });

  create('post').then(function(post) {
    equal(post.get('title'), 'Teddy');
  });
});

test("Can use functions as related model attributes", function() {
  expect(1);

  Factory.define('author', {
    name: 'Teddy'
  });

  Factory.define('post', {
    title: 'Post title',
    author: function() {
      return {
        name: 'Zini'
      };
    }
  });

  create('post').then(function(post) {
    equal(post.get('author.name'), 'Zini');
  });

});

test("Can customize which model to use", function() {
  expect(1);

  Factory.define('article', {
    title: 'Article'
  }, { modelName: 'Post' });

  create('article').then(function(article) {
    ok(article instanceof App.Post);
  });

});

test("Can overwrite belongsTo with null", function() {
  expect(2);
  Factory.define('author', {
    name: 'Teddy'
  });

  Factory.define('post', {
    title: 'Post',
    author: {}
  });

  create('post').then(function(post) {
    equal(post.get('author.name'), 'Teddy');
  });

  create('post', { author: null }).then(function(post){
    equal(post.get('author'), null);
  });

});


test("Events are correctly triggered", function() {
  expect(10);

  var record = null, attributes = { name: 'Teddy' };

  Factory.define('author', {});

  Factory.one('beforeBuild', function(e) {
    ok(true, 'before build fired');
    equal(e.name, 'author');
    deepEqual(attributes , e.attr);
  });

  Factory.one('afterBuild', function(e) {
    ok(true, 'after build fired');
    record = e.record;
  });


  Factory.one('beforeCreate', function(e) {
    ok(true, 'before create fired');
    equal(e.name, 'author');
    deepEqual(attributes , e.attr);
  });

  Factory.one('afterCreate', function(e) {
    ok(true, 'after create fired');
    record = e.record;
  });


  build('author', attributes).then(function(author) {
    ok(author === record, "correct record is passed with afterBuild event");
    record = null;
  })
  .create('author', attributes).then(function(author) {
    ok(author === record, "correct record is passed with afterCreate event");
  });


});

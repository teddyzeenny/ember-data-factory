var App;

function buildApp() {
  Em.run(function() {
    App = window.App = Em.Application.create();
  });

  App.Store = DS.Store.extend({
    adapter: DS.FixtureAdapter.create({
      simulateRemoteResponse: false
    })
  });

  App.Post = DS.Model.extend({
    title: DS.attr('string'),
    body: DS.attr('string'),
    comments: DS.hasMany('App.Comments'),
    author: DS.belongsTo('App.Author')
  });

  App.Post.FIXTURES = [];

  App.Comment = DS.Model.extend({
    title: DS.attr('string'),
    text: DS.attr('string'),
    post: DS.belongsTo('App.Post')
  });

  App.Comment.FIXTURES = [];

  App.Author = DS.Model.extend({
    name: DS.attr('string'),
    posts: DS.hasMany('App.Post')
  });

  App.Author.FIXTURES = [];

  App.setupForTesting();
  Em.run(App, App.advanceReadiness);
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

// test("Can build hasMany relationships through attributes and model instances", function() {
//   expect(5);
//   var post;

//   Em.run(function() {
//     post = App.Post.createRecord({
//       title: 'Post 3'
//     });
//   });

//   Factory.define('author', {
//     name: 'Teddy',
//     posts: [{
//         title: 'Post 1'
//       }, {
//         title: 'Post 2'
//       },
//       post
//     ]
//   });

//   Factory.define('post', {
//     title: 'Post Title'
//   });


//   create('author').then(function(author) {
//     ok(author instanceof App.Author);
//     equal(author.get('posts.length'), 3);
//     equal(author.get('posts').objectAt(0).get('title'), 'Post 1');
//     equal(author.get('posts').objectAt(1).get('title'), 'Post 2');
//     equal(author.get('posts').objectAt(2).get('title'), 'Post 3');
//   });

// });

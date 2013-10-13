Ember Data Factory [![Build Status](https://secure.travis-ci.org/teddyzeenny/ember-data-factory.png?branch=master)](http://travis-ci.org/teddyzeenny/ember-data-factory)
===============

Factory library for Ember Data.  Allows you to define and create factories instead of using fixtures.  It is best used with the ember-testing package.

Why use it?
-------------
Aside from the advantages of using factories instead of fixtures, by using Ember Data Factory in your tests, you will be able to create tests that are independent of your adapter.  You can write tests using factories and run them with fixture adapter, and later switch to another adapter (such as RestAdapter, LocalStorageAdapter) to test integration with a specific backend.

Defining factories
--------------------
You should provide a name and default attributes to every factory definition.

```javascript
Factory.define('post', {
  title: 'Post Title',
  body: 'This is the content'
});
```
This will define a factory for the `App.Post` model.

Using factories
------------------

Given the factory definition:
```javascript
Factory.define('post', {
  title: 'Post Title',
  body: 'Post body'
});
```
There are three ember-testing helpers you can use: `attr`, `build`, and `create`

`attr` helper returns an object containing the attributes.

```javascript
var postAttributes = attr('post'); // { title: 'Post Title', body: 'Post body' }
```

`build` helper creates a model instance but does not commit.  This helper is async and therefore a promise.  It can be chained with any other ember-testing helper.

```javascript
build('post').then(function(post) {
  post instanceof App.Post; // true
  post.get('isNew'); // true
  post.get('title'); // Post Title
});
```

`create` helper creates a model same as `build`, but also commits it.  This helper is also async and therefore is a promise and can be chained to any other async helper.

```javascript
create('post').then(function(post) {
  post instanceof App.Post; // true
  post.get('isNew'); // false
  post.get('title'); // Post Title
});
```

You can pass custom properties to any of these helpers.  Passed properties will overwrite the default ones.

```javascript
attr('post', { title: 'My Post'} ); // { title: 'My Post', body: 'Post body' }
```


Factories and Related Records
------------------------------------

If the model belongs to a parent model, you can define the parent attributes in the factory definition (or creation).

```javascript
Factory.define('post', {
  title: 'My Post'
});

Factory.define('comment', {
  title: 'My Comment'
  post: {}
});

create('comment').then(function(comment) {
  comment.get('post.title'); // 'My Post'
});

```

You can also override the attributes for a specific relation:

```javascript
Factory.define('comment', {
  title: 'My Comment',
  post: {
    title: "My Comment's Post"
  }
});

create('comment', { post: { body: 'Custom Body' } }).then(function(comment) {
  comment.get('title'); // "My Comment"
  comment.get('post.title'); // "My Comment's Post'
  comment.get('post.body'); // "Custom Body"
});
```

Attributes as Functions
---------------------------------

You can use functions to set attributes.  The attribute value will be the return value of the function.  The function will get the current application as a parameter.

```javascript
Factory.define('post', {
  published:   function(app) { return new Date(); }
});
```

You can also functions on related records:



```javascript
Factory.define('post', {
  user: function(app) {
    return app.get('currentUser');
  }
});
```

If a related record needs to use a special factory definition, you can use a combination of function and `attr` to achieve that:

```javascript
Factory.define('specialAuthor', { name: 'Teddy' }, { modelName: 'user' });

Factory.define('post', {
  author: function() {
    return attr('specialAuthor');
  }
});
```

Ember-testing Example
---------------------------

```javascript

Factory.define('author', {
  name: 'Teddy'
});

Factory.define('post', {
  title: 'My Post',
  author: {}
});

test("Editing a post", function() {
   create('post')
  .visit('/posts')
  .click('.post-title')
  .click('.edit')
  .fillIn('.txt-title', 'New Title')
  .click('.submit')
  .then(function() {
    equal(find('.post-title').text(), 'New Title');
    equal(find('.author-name').text(), 'Teddy');
  });
});
```

Events
-------

Events are fired before and after building/creating factories.

The events are: `beforeBuild`, `afterBuild`, `beforeCreate`, `afterCreate`

Example:

```javascript
var countPosts = 0;
Factory.on('beforeCreate', function(e) {
  if (e.name === 'post') {
    console.log('Will create post number ' + (++countPosts));
  }
});
```

This can be useful when you want to perform special operations before/after factory requests.

Here's an example of an app that informs the server not to perform any authorization for factory requests.

```javascript
var isFactoryRequest = false;

App.ApplicationAdapter.reopen({

    ajax: function(url, type, hash) {
      if(isFactoryRequest) {
        hash = hash || {};
        hash.data = hash.data || {};
        hash.data.is_factory_request = 1;
      }
      return this._super(url, type, hash);
    }
});

Factory.on('beforeCreate', function(e) {
  isFactoryRequest = true;
});

Factory.on('afterCreate', function(e) {
  isFactoryRequest = false;
});

```



Installation, Building, and Testing
---------------------------

To directly use the library, head up to the `dist` directory and download the file you need.

### Building and Testing:

Run `npm install` to install necessary modules.  Then:

- `grunt` To build the files in the `dist` directory
- `grunt test` To run the tests in the terminal
- `grunt server` to start the test server and then visit `localhost:8000` in the browser

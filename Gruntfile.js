module.exports = function(grunt) {
  // Load grunt-microlib config & tasks
  var emberConfig = require('grunt-microlib').init.bind(this)(grunt);
  grunt.loadNpmTasks('grunt-microlib');


  var config = {
    cfg: {
      // Name of the project
      name: 'ember-data-factory.js',

      // Name of the root module (i.e. 'rsvp' -> 'lib/rsvp.js')
      barename: 'factory',

      // Name of the global namespace to export to
      namespace: 'Factory'
    },

    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      tests: {
        src: ['test/tests.js'],
        dest: 'tmp/tests-bundle.js'
      }
    },

    qunit: {
      all: {
        options: {
          urls: [
            'http://localhost:8000'
          ]
        }
      }
    }
  };

  // Merge config into emberConfig, overwriting existing settings
  grunt.initConfig(grunt.util._.merge(emberConfig, config));

  // Load custom tasks from NPM
  grunt.loadNpmTasks('grunt-browserify');
};

module.exports = function(grunt) {
  // Load grunt-microlib config & tasks
  var microlibConfig = require('grunt-microlib').init.bind(this)(grunt);
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

    qunit: {
      all: {
        options: {
          urls: [
            'http://localhost:8000'
          ]
        }
      }
    },

    buildTestFiles: {
      dist: {
        src: ['dist/<%= pkg.name %>-<%= pkg.version %>.js', 'test/tests.js'],
        dest: 'tmp/tests.js'
      }
    },


    browserify: {
      tests: {
        src: ['test/tests.js'],
        dest: 'tmp/tests-bundle.js'
      }
    }

  };


  // I have no idea what i'm doing

  this.registerTask('tests', "Builds the test package", ['concat:deps', 'browserify:tests', 'buildTestFiles:dist']);



  grunt.registerMultiTask('buildTestFiles', "Execute the tests", function() {

    this.files.forEach(function(f) {
      var output = ["(function(globals) {"];

      output.push.apply(output, f.src.map(grunt.file.read));

      output.push('})(window);');

      grunt.file.write(f.dest, output.join("\n"));
    });
  });


  // Merge config into microlibConfig, overwriting existing settings
  grunt.initConfig(grunt.util._.merge(microlibConfig, config));


  // Load custom tasks from NPM
  grunt.loadNpmTasks('grunt-browserify');
};

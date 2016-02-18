module.exports = function (grunt) {
  var path = require('path');
  // Add the grunt-mocha-test tasks.
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-notify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.initConfig({
    // Configure a mochaTest task
    mochaTest: {
      unit: {
        options: {
          reporter: 'spec'
        },
        src: ['test/server/unit/**/*.js', 'services/*/test/unit/**/*.js']
      },
      smoke: {
        options: {
          reporter: 'spec'
        },
        src: ['test/smoke/**/*.js', 'services/*/test/smoke/**/*.js']
      },
      functional: {
        options: {
          reporter: 'spec'
        },
        src: ['test/functional/**/*.js', 'services/*/test/functional/**/*.js']
      }
    },
    watch: {
      scripts: {
        files: ['**/*.js'],
        tasks: ['quickFeedback'],
      },
    },
    clean: {
      testData: ['test/data/']
    },
    copy: {
      testData: {
        files: [{
          expand: true,
          cwd: 'test/fixtureData',
          src: ['**'],
          dest: 'test/data/'
        }, ],
      },
    }
  });

  console.log('GRUNT:', 'USER_DATA_PATH', path.join(__dirname, 'test', 'data'));
  grunt.registerTask('unitTest', ['mochaTest:unit']);
  grunt.registerTask('systemTest', ['clean:testData', 'copy:testData', 'mochaTest:smoke']);
  grunt.registerTask('test', ['clean:testData', 'copy:testData', 'unitTest', 'systemTest']);
  grunt.registerTask('quickFeedback', ['unitTest']);
  grunt.registerTask('default', ['test']);

};

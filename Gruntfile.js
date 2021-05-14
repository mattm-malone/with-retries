module.exports = function (grunt) {
  grunt.initConfig({
    clean: ['./dist'],
    ts: {
      default: {
        tsconfig: {
          tsconfig: './tsconfig.json',
          passThrough: true,
        },
      },
    },
    copy: {
      main: {
        expand: true,
        src: ['*.md', 'LICENSE'],
        dest: 'dist/',
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('default', ['clean', 'ts', 'copy']);
};

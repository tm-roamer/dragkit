var package = require('./package.json'),
    gulp = require('gulp'),
    uglify = require('gulp-uglify'),            // 压缩
    rename = require("gulp-rename"),            // 重命名
    esformatter = require('gulp-esformatter'),  // 格式化美观
    fileinclude = require('gulp-file-include'); // 将各个零散的js组装在一起

gulp.task('default', function() {
    gulp.src(['./src/module.js'])
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(esformatter({indent: {value: '    '}}))
        .pipe(rename(function (path) {
            // path.dirname += "/ciao";
            path.basename = package.name;
        }))
        .pipe(gulp.dest('./docs'))
        .pipe(rename(function (path) {
            path.basename = package.name;
            path.extname = ".min.js"
        }))
        .pipe(uglify())
        .pipe(gulp.dest('./docs'));
});
/*
    IMPORTS
*/
const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const cssnano = require('gulp-cssnano');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const fileinclude = require('gulp-file-include');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');

const mozjpeg = require('imagemin-mozjpeg');
const jpegtran = require('imagemin-jpegtran');
const pngquant = require('imagemin-pngquant');
const svgo = require('imagemin-svgo');

const browserSync = require('browser-sync');
const del = require('del');

const iconsToStrings = require('./scripts/generate-icons-list.js');


/*
    CONFIG
*/
const paths = {
  styles: {
    src: 'src/sass',
    dest: 'css/'
  },
  html: {
    src: 'src/html',
    dest: '.'
  },
  images: {
    src: 'src/img',
    dest: 'img/'
  },
  fonts: {
    src: 'src/fonts',
    dest: 'fonts/'
  }
};

const config = {
  svgo: {
    plugins: [
      {
        removeViewBox: false,
      },
      {
        removeDimensions: true,
      },
      {
        removeStyleElement: true,
      },
      {
        addClassesToSVGElement: {
          classNames: ['icon-svg']
        }
      },
    ]
  }
}


/*
    CONS & HELPERS
*/
const _gulpsrc = gulp.src;
gulp.src = function() {
  return _gulpsrc.apply(gulp, arguments)
    .pipe(plumber({
      errorHandler: function(err) {
        notify.onError({
          title:    "Gulp Error",
          message:  "Error: <%= error.message %>",
          sound:    "Bottle"
        })(err);
        this.emit('end');
      }
    }));
};

// Browser Sync
const server = browserSync.create();

function reload(done) {
  server.reload();
  done();
}

function serve(done) {
  server.init({
    server: {
      baseDir: './'
    }
  });
  done();
}


/*
    BUILD
*/

// Styles
function styles() {
  return gulp.src(`${paths.styles.src}/*.scss`)
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(autoprefixer({
        browsers: config.browsers_legacy,
        cascade: false
    }))
    .pipe(cssnano())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(paths.styles.dest));
}
exports.styles = styles;



// HTML
function html() {
  return gulp.src(`${paths.html.src}/**/*.html`)
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest(paths.html.dest));
}

// Includes
function include() {
  return gulp.src([
    `${paths.html.src}/**/*.html`,

    `!${paths.html.src}/snippets/*.html`
  ])
  .pipe(fileinclude({
    prefix: '@@',
    basepath: './'
  }))
  .pipe(gulp.dest(paths.html.dest))
}


// Images
function delete_images(done) {
  del([`${paths.images.dest}**/*`, `!${paths.images.dest}**/unicorn.jpg`]).then((paths) => {
    console.log('Deleted image files and folders:\n', paths.join('\n'));
    done();
  });
}

function imagemin_compress() {
  return gulp.src([
    `${paths.images.src}/**/*`,
    `${paths.images.src}/icons/**/*`,

    // not files / directories below
    `!${paths.images.src}/**/*.md`,
    `!${paths.images.src}/_lossless/**/*`,
    `!${paths.images.src}/_highq/**/*`,
  ])
    .pipe(imagemin([
      mozjpeg({progressive: true, quality: 85}),
      pngquant({speed: 6, quality: [0.7, 0.8]}),
      svgo(config.svgo)
    ]))
    .pipe(gulp.dest(paths.images.dest))
}

function imagemin_highq() {
  return gulp.src([
    `${paths.images.src}/_highq/**/*`,

    // not files / directories below
    `!${paths.images.src}/_highq/**/*.md`,
  ])
    .pipe(imagemin([
      mozjpeg({progressive: true, quality: 95}),
      pngquant({speed: 6, quality: [0.9, 0.95]}),
    ]))
    .pipe(gulp.dest(`${paths.images.dest}_highq`))
}

function imagemin_lossless() {
  return gulp.src([
    `${paths.images.src}/_lossless/**/*`,

    // not files / directories below
    `!${paths.images.src}/_lossless/**/*.md`,
  ])
    .pipe(imagemin([
      jpegtran({progessive: true}),
      pngquant({speed: 6, quality: [0.95, 1]}),
    ]))
    .pipe(gulp.dest(`${paths.images.dest}_lossless`))
}

// Icons to Strings
function icons(done) {
  iconsToStrings().then(() => {
    console.log('is done');
    done();
  });
}

const images = gulp.series(
  delete_images,
  imagemin_compress,
  imagemin_highq,
  imagemin_lossless,
  icons,
);
exports.images = images;


// FONTS
function delete_fonts(done) {
  del(`${paths.fonts.dest}**/*`).then((paths) => {
    console.log('Deleted font files and folders:\n', paths.join('\n'));
    done();
  });
}
function copy_fonts() {
  return gulp.src(`${paths.fonts.src}/**/*`)
  .pipe(gulp.dest(paths.fonts.dest));
}

const fonts = gulp.series(
  delete_fonts,
  copy_fonts
);
exports.fonts = fonts;


/*
  TASKS
*/
const watch = () => {
  gulp.watch(`${paths.html.src}/**/*.html`, gulp.series(include, reload));
  gulp.watch(`${paths.styles.src}/**/*.scss`, gulp.series(styles, reload));
  gulp.watch(`${paths.fonts.src}/**/*`, gulp.series(fonts, reload));
};
exports.watch = watch;


const dev = gulp.series(
  gulp.parallel(html, styles, fonts),
  serve,
  watch
);
exports.dev = dev;


const build = gulp.series(
  include,
  gulp.parallel(html, styles, fonts),
  images,
  icons
);
exports.default = build;

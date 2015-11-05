/**
 * Created by kim.holland on 05/11/15.
 */

var request = require('request'),
    cheerio = require('cheerio'),
    mongoose = require('mongoose'),
    DB_STATE = require('mongoose/lib/connectionstate'),
    Film = require('./lib/film.schema');

var SOURCE_URL = 'http://www.imdb.com/user/ur28880908/watchlist';
var DB_NAME = 'localhost/xs3-movies';
var results, operations = [];

mongoose.connection.on('connected', function () {
    if (results) {
        updateDB(results);
    }
});
mongoose.connect('mongodb://' + DB_NAME);

fetch();


function fetch() {
    console.log('fetch()');

    request(SOURCE_URL, function (err, response, body) {
        if (err) {
            console.log(err);
            return;
        }

        results = scrapeFilms(body);
        if (mongoose.connection.readyState === DB_STATE.connected) {
            updateDB(results);
        }
    });
}

function scrapeFilms(html) {
    console.log('scrapeFilms()');

    var $ = cheerio.load(html);

    return $('.lister-item').map(function (idx, item) {
        return new Film({
            title: $('.lister-item-header a', item).text().trim(),
            link: $('.lister-item-header a', item).attr('href'),
            genre: $('.lister-item-content .genre', item).text().trim(),
            image: $('.lister-item-image a img', item).attr('src')
        });
    }).get();
}

function updateDB(films) {
    console.log('updateDB()', films.length + ' items');

    var query;

    films.forEach(function (film) {

        query = Film.findOne({title: film.title});
        query.then(function (result) {
            if (result) {
                console.log('Existing film: ' + film.title);
            } else {
                saveFilm(film);
            }
        });

        operations.push(query);
    });

    Promise.all(operations).then(function () {
        // if any more operations resulted from the queries then re-evaluate:
        Promise.all(operations).then(function() {
            console.log('> All DB operations complete');
            exit();
        });
    });
}

function saveFilm(film) {
    console.log('New Film: ' + film.title);
    operations.push(new Promise(function (resolve) {
        film.save(function (err) {
            console.log(err || 'Film saved: ' + film.title);
            resolve();
        });
    }));
}


function exit() {
    console.log('exit');
    mongoose.disconnect();
}

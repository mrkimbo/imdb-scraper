
var request = require('request'),
    cheerio = require('cheerio'),
    mongoose = require('mongoose'),
    Config = require('./lib/config'),
    DB_STATE = require('mongoose/lib/connectionstate'),
    Film = require('./lib/film.schema');

var results, queue = [];

mongoose.connection.on('connected', function () {
    if (results) {
        updateDB(results);
    }
});
mongoose.connect('mongodb://' + Config.DB_HOST + Config.DB_NAME);

fetch();


function fetch() {
    console.log('fetch()');

    request(Config.SOURCE_URL, function (err, response, body) {
        if (err) {
            console.log(err);
            return;
        }

        results = scrapeFilms(body);
        if (isConnected()) {
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
                var operation = saveFilm(film)
                    .then(function() {
                        console.log('Film saved: ' + film.title);
                        dequeue(operation);
                    });
            }
            dequeue(query);
        });

        enqueue(query);
    });
}

function saveFilm(film) {
    console.log('New Film: ' + film.title);
    var promise = new Promise(function (resolve) {
        film.save(function (err) {
            resolve();
        });
    });
    enqueue(promise);
    return promise;
}

function enqueue(item) {
    queue.push(item);
}

function dequeue(item) {
    var idx = queue.indexOf(item);
    if(idx) queue.splice(idx, 1);

    if(!queue.length) {
        exit();
    }
}

function isConnected() {
    return mongoose.connection.readyState === DB_STATE.connected;
}

function exit() {
    console.log('exit');
    mongoose.disconnect();
}

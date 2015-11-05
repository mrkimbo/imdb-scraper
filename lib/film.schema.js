/**
 * Created by kim.holland on 05/11/15.
 */

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var schema = new Schema({
    title:  String,
    link: String,
    image: String,
    genre: String
});

module.exports = mongoose.model('Film', schema);

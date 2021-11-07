const app = require( "express" )();
const server = require( "http" ).Server( app );
const bodyParser = require( "body-parser" );
const async = require( "async" );
const PouchDB = require('pouchdb');

app.use( bodyParser.json() );

module.exports = app;

let categoryDB = new PouchDB('db/categories');

app.get( "/", function ( req, res ) {
    res.send( "Category API" );
} );

app.get( "/all", function ( req, res ) {
    categoryDB.allDocs({
        include_docs: true
    }).then(function (result) {
        res.send( result.rows );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} );
 
app.post( "/category", function ( req, res ) {    
    let id = Math.floor(Date.now() / 1000);

    categoryDB.put({
        _id: id.toString(),
        name: req.body.name
    }).then(function (result) {
        res.sendStatus( 200 )
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} );

app.delete( "/category/:categoryId", function ( req, res ) {
    let id = req.params.categoryId;

    categoryDB.get(id).then(function(cat) {
        return categoryDB.remove(cat);
    }).then(function (result) {
        res.sendStatus( 200 );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} );

app.put( "/category", function ( req, res ) {

    let id = req.body.id;

    categoryDB.get(id).then(function(cat) {
        return categoryDB.put({
        _id: id,
        _rev: cat._rev,
        name: req.body.name
        });
    }).then(function(response) {
        res.sendStatus( 200 );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
});
 

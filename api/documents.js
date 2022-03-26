const app = require( "express")();
const PouchDB = require('pouchdb');
const PouchdbFind = require('pouchdb-find');

PouchDB.plugin(PouchdbFind);

let documentsDB = new PouchDB(process.env.DB_HOST + 'documents');

app.get( "/", function ( req, res ) {
    res.send( "Users API" );
} );



app.get( "/all", function ( req, res ) {
    
} );




app.get( "/by-status", function ( req, res ) {
    let status = req.query.status;
    
    documentsDB.find({
        selector: { status: status }
    }).then(function (result) {
        res.send( result );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });

    // usersDB.allDocs({
    //     include_docs: true
    // }).then(function (result) {
    //     res.send( result.rows );
    // }).catch(function (err) {
    //     res.status( 500 ).send( err );
    //     console.log(err);
    // });
} );




module.exports = app;



const app = require( "express" )();
const PouchDB = require('pouchdb');
const CONFIG = require('../config');

let logsDB = new PouchDB(CONFIG.DB_HOST + 'logs');

app.get( "/", function ( req, res ) {
    res.send( "Logs API" );
} );

app.get( "/all", function ( req, res ) {
    logsDB.allDocs({
        include_docs: true
    }).then(function (result) {
        res.send( result.rows );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} );



app.get("/by-transaction", function(req, res) {

    let id = req.query.id
    console.log(id)
    logsDB.find({
      selector: { transaction: id },
      sort: [{_id: 'desc'}]
    }).then(function (result) {
      res.send(result)
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
});
 
module.exports = app;
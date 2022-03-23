const app = require( "express" )();
const PouchDB = require('pouchdb');
let customerDB = new PouchDB(process.env.DB_HOST + 'customers');

app.get( "/", function ( req, res ) {
    res.send( "Customer API" );
} );
 
app.get( "/all", function ( req, res ) {
	customerDB.allDocs({
	     include_docs: true
    }).then(function (result) {
        res.send( result.rows );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} );
 
app.post( "/customer", function ( req, res ) {
    let id = Math.floor(Date.now() / 1000);
    let newCustomer = req.body;

    customerDB.put({
        ...newCustomer,
        _id: id.toString(),
    }).then(function (result) {
        res.sendStatus( 200 )
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    })
} );

app.delete( "/customer/:customerId", function ( req, res ) {
    let id = req.params.customerId;

    customerDB.get(id).then(function( cus ) {
        return customerDB.remove( cus );
    }).then(function (result) {
        res.sendStatus( 200 );
    }).catch(function ( err ) {
        res.status( 500 ).send( err );
        console.log( err );
    })
} );

app.put( "/customer", function ( req, res ) {
    let id = req.body.id;
    let newCustomer = req.body;

    customerDB.get(id).then(function( cus ) {
        return customerDB.put({
            ...newCustomer,
            _id: id,
            _rev: cus._rev
        });
    }).then(function( response ) {
        res.sendStatus( 200 );
    }).catch(function( err ) {
        res.status( 500 ).send( err );
        console.log( err );
    })
});

app.get( "/customer/:customerId", function ( req, res ) {
    if ( !req.params.customerId ) {
        res.status( 500 ).send( "ID field is required." );
    } else {
        customerDB.findOne( {
            _id: req.params.customerId
        }, function ( err, customer ) {
            res.send( customer );
        } );
    }
} );

module.exports = app;
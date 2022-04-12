const app = require( "express" )();
const PouchDB = require('pouchdb');
const CONFIG = require('../config');
let apisperu = require("../helpers/apisperu");

let customerDB = new PouchDB(CONFIG.DB_HOST + 'customers');

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
 
app.post( "/customer", async function ( req, res ) {
    let id = Math.floor(Date.now() / 1000);
    var newCustomer = req.body;

    try {
        let cust = await customerDB.query(function(doc, emit) {
            emit(doc.document_type.number);
        }, {key: newCustomer.document_type.number})

        if (cust.rows.length) {
            return res.status( 500 ).send( 'Ya existe un cliente con el mismo DNI o RUC' );
        }
    } catch (err) {
        console.log(err)
    }
   
    customerDB.put({
        ...newCustomer,
        _id: id.toString(),
    }).then(async function (result) {
        let customer = await customerDB.get(result.id);
        res.json(customer)
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
        return customerDB.get(response.id)
    }).
    then(function(customer) {
        res.status( 200 ).json(customer);
    }).catch(function( err ) {
        res.status( 500 ).send( err );
        console.log( err );
    })
});

app.get( "/customer/:customerId", function ( req, res ) {
    if ( !req.params.customerId ) {
        res.status( 500 ).send( "ID field is required." );
    } else {
        customerDB.get(req.params.customerId)
        .then(function(response) {
            res.send( response );
        }).catch(function(err) {
            console.log(err);
            res.status( 500 ).send( err );
        })
    }
} );


app.get( "/search/:type/:number", function ( req, res ) {
    if ( !req.params.type || !req.params.number ) {
        res.status( 500 ).send( "Type or number field is required." );
    } else {
        apisperu.getDniRuc(req.params.type, req.params.number)
        .then(function(r) {
            res.status( 200 ).json( r.data );
        }).catch(function(err) {
            console.log(err);
            res.status( 500 ).send( err );
        })
    }
} );

module.exports = app;
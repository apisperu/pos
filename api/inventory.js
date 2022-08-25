const app = require( "express" )();
const server = require( "http" ).Server( app );
const bodyParser = require( "body-parser" );
const Datastore = require( "nedb" );
const async = require( "async" );
const multer = require("multer");
const fs = require('fs');
const CONFIG = require('../config');

const PouchDB = require('pouchdb');
let inventoryDB = new PouchDB(CONFIG.DB_HOST + 'inventory');

let upload = multer();

app.use(bodyParser.json());

app.get( "/", function ( req, res ) {
    res.send( "Inventory API" );
} );

app.get( "/product/:productId", function ( req, res ) {
    if ( !req.params.productId ) {
        res.status( 500 ).send( "ID field is required." );
    } else {
        inventoryDB.get(req.params.productId).then(function (result) {
            res.send( result );
        }).catch(function (err) {
            res.status( 500 ).send( err );
            console.log(err);
        });
    }
} );

app.get( "/products", function ( req, res ) {
    inventoryDB.allDocs({
        include_docs: true,
        attachments: true
    }).then(function (result) {
        res.send( result.rows );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} );

app.post( "/product", upload.single('imagename'), async function ( req, res ) {

    let Product = {
        _id: (req.body.id).toString(),
        price: req.body.price,
        category: req.body.category,
        quantity: req.body.quantity == "" ? 0 : req.body.quantity,
        name: req.body.name,
        stock: req.body.stock == "on" ? 0 : 1,
        barcode: req.body.barcode || ''
    }

    
    if(req.file) {
        Product._attachments = {
            'image': {
                content_type: req.file.mimetype,
                data: req.file.buffer
            }
        }
    }

    if (req.body.id) {
        if(req.body.remove === "1") {
            try {
                var pro = await inventoryDB.get((req.body.id).toString());
                await inventoryDB.removeAttachment((req.body.id).toString(), 'image', pro._rev);
            } catch (err) {
                res.status( 500 ).send( err );
                console.log(err);
            }
        }

        try {
            var pro = await inventoryDB.get((req.body.id).toString());
            await inventoryDB.put({ ...pro, ...Product });
            res.sendStatus( 200 );
        } catch (err) {
            res.status( 500 ).send( err );
            console.log(err);
        }
    } else {
        
        try {
            Product._id = (Math.floor(Date.now() / 1000)).toString();
            await inventoryDB.put({ ...Product })
            res.sendStatus( 200 )
        } catch (err) {
            res.status( 500 ).send( err );
            console.log(err);
        }
    }
});
 
app.delete( "/product/:productId", function ( req, res ) {
    let id = req.params.productId;

    inventoryDB.get(id).then(function(response) {
        return inventoryDB.remove(response);
    }).then(function (result) {
        res.sendStatus( 200 );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} ); 

app.post( "/product/sku", function ( req, res ) {
    var request = req.body;

    inventoryDB.find({
        selector: { barcode: request.skuCode },
        limit: 1
    }).then(function (result) {
        if (result.docs.length) {
            res.send( result.docs[0] );
        } else {
            res.send( result );
        }
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });

    // inventoryDB.get(request.skuCode).then(function (result) {
    //     res.send( result );
    // }).catch(function (err) {
    //     res.status( 500 ).send( err );
    //     console.log(err);
    // });
} );

app.decrementInventory = async function ( products ) {
    try {
        for (let i = 0; i < products.length; i++) {
            let item = products[i];
            let product = await inventoryDB.get(item.id);
            
            if (product._id) {
                let updateQuantity = parseInt(product.quantity) - parseInt(item.quantity);
                await inventoryDB.put({ ...product, quantity: updateQuantity });
            }
        }
    } catch (err) {
        console.log(err)
    }
};

module.exports = app;
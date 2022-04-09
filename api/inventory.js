const app = require( "express" )();
const server = require( "http" ).Server( app );
const bodyParser = require( "body-parser" );
const Datastore = require( "nedb" );
const async = require( "async" );
const multer = require("multer");
const fs = require('fs');

const PouchDB = require('pouchdb');
let inventoryDB = new PouchDB(process.env.DB_HOST + 'inventory');

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
        stock: req.body.stock == "on" ? 0 : 1
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


    // if(req.body.id == "") { 
    //     Product._id = (Math.floor(Date.now() / 1000)).toString();
    //     inventoryDB.put({ ...Product }).then(function (result) {
    //         res.sendStatus( 200 )
    //     }).catch(function (err) {
    //         res.status( 500 ).send( err );
    //         console.log(err);
    //     });
    // }
    // else { 
    //     inventoryDB.get((req.body.id).toString()).then(function(response) {
    //         return inventoryDB.put({
    //         _id: req.body.id.toString(),
    //         _rev: response._rev,
    //         ...Product,
    //         });
    //     }).then(function(response) {
    //         res.sendStatus( 200 );
    //     }).catch(function (err) {
    //         res.status( 500 ).send( err );
    //         console.log(err);
    //     });

    // }

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


    inventoryDB.get(request.skuCode).then(function (result) {
        res.send( result );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} );

app.decrementInventory = function ( products ) {
    async.eachSeries(products, function (transactionProduct, callback){

        inventoryDB.get(transactionProduct.id)
            .then( product => {
                if (!product || !product.quantity) callback();
                let updateQuantity = parseInt(product.quantity) - parseInt( transactionProduct.quantity);
                return { product, updateQuantity };
            })
            .then(result => {
                updateProduct(result.product, result.updateQuantity)
            }).catch((err) => {
            console.log(err);
          });

    });
};

const updateProduct = (product, updateQuantity) => {

    inventoryDB.get(product._id).then(doc => {

    //modificamos quantity
    doc.quantity = updateQuantity;

    return inventoryDB.put({ ...doc, _id: doc._id, _rev: doc._rev });

    }).catch(err => console.log(err));

}

module.exports = app;
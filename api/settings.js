const app = require( "express")();
const multer = require("multer");
const fs = require('fs');
const PouchDB = require('pouchdb');
let settingsDB = new PouchDB(process.env.DB_HOST + 'settings');

let upload = multer();

app.get( "/", function ( req, res ) {
    res.send( "Settings API" );
} );

app.get( "/all", function ( req, res ) {
    settingsDB.get('1', {attachments: true}).then(function (result) {
        res.send( result );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} );
 
app.post( "/", upload.single('imagename'), async function ( req, res ) {
    let Settings = {  
        _id: '1',
        settings: {
            "app": req.body.app,
            "store": req.body.store,
            "address_one": req.body.address_one,
            "address_two":req.body.address_two,
            "contact": req.body.contact,
            "tax": req.body.tax,
            "symbol": req.body.symbol,
            "percentage": req.body.percentage,
            "charge_tax": req.body.charge_tax,
            "footer": req.body.footer,
            "serie": req.body.serie,
            "numero": req.body.numero,
            "token": req.body.token
        }       
    }

    if(req.file) {
        Settings._attachments = {
            'logo': {
                content_type: req.file.mimetype,
                data: req.file.buffer
            }
        }
    }

    if (req.body.id) {
        if(req.body.remove === "1") {
            try {
                var setting = await settingsDB.get((req.body.id).toString());
                await settingsDB.removeAttachment('1', 'logo', setting._rev);
            } catch (err) {
                res.status( 500 ).send( err );
                console.log(err);
            }
        }

        try {
            var setting = await settingsDB.get((req.body.id).toString());
            await settingsDB.put({ ...setting, ...Settings });
            res.sendStatus( 200 );
        } catch (err) {
            res.status( 500 ).send( err );
            console.log(err);
        }

    } else {

        try {
            await settingsDB.put({ _id: '1', ...Settings })
            res.sendStatus( 200 )
        } catch (err) {
            res.status( 500 ).send( err );
            console.log(err);
        }
    }
});

module.exports = app;
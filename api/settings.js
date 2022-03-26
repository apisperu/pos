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
            "vat_no": req.body.vat_no,
            "symbol": req.body.symbol,
            "percentage": req.body.percentage,
            "charge_tax": req.body.charge_tax,
            "footer": req.body.footer,
            "serie": req.body.serie,
            "next_correlative": req.body.next_correlative,
            "token": req.body.token,
            "document_types": [
                { "code": "12", "name": "Ticket", "serie": req.body.serie_t, "next_correlative": req.body.next_correlative_t},
                { "code": "03", "name": "Boleta Electrónica", "serie": req.body.serie_b, "next_correlative": req.body.next_correlative_b },
                { "code": "01", "name": "Factura Electrónica", "serie": req.body.serie_f, "next_correlative": req.body.next_correlative_f }
            ]
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
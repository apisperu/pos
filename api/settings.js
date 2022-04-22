const app = require( "express")();
const multer = require("multer");
const fs = require('fs');
const PouchDB = require('pouchdb');
const CONFIG = require('../config');
const archiver = require('archiver');
const AdmZip = require("adm-zip");


let settingsDB = new PouchDB(CONFIG.DB_HOST + 'settings');


const storage = multer.diskStorage({
    destination: __dirname + '/../',
    filename: function(req, file, callback){
        callback(null, 'db.zip'); // 
    }
});
let upload = multer({ storage: storage });
let uploadLogo = multer();

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
 
app.post( "/", uploadLogo.single('imagename'), async function ( req, res ) {
    let Settings = {  
        _id: '1',
        settings: {
            "app": req.body.app,
            "store": req.body.store,
            "legal_name": req.body.legal_name,
            "tradename": req.body.tradename,
            "address": {
                "street": req.body.street,
                "state": req.body.state,
                "city": req.body.city,
                "district": req.body.district,
                "zip": req.body.zip,
            },
            "contact": req.body.contact,
            "vat_no": req.body.vat_no,
            "symbol": req.body.symbol,
            "percentage": req.body.percentage,
            "charge_tax": !!req.body.charge_tax,
            "price_with_tax": !!req.body.price_with_tax,
            "footer": req.body.footer,
            "serie": req.body.serie,
            "next_correlative": parseInt(req.body.next_correlative),
            "token": req.body.token,
            "token_consulta": req.body.token_consulta,
            "document_types": [
                { "code": "12", "name": "Ticket", "send_sunat": false, "serie": req.body.serie_t, "next_correlative": parseInt(req.body.next_correlative_t) },
                { "code": "03", "name": "Boleta Electrónica", "send_sunat": true, "serie": req.body.serie_b, "next_correlative": parseInt(req.body.next_correlative_b) },
                { "code": "01", "name": "Factura Electrónica", "send_sunat": true, "serie": req.body.serie_f, "next_correlative": parseInt(req.body.next_correlative_f) }
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

app.get( "/export", async function ( req, res ) {
    var archive = archiver('zip');

    archive.on('error', function(err) {
        return res.status(500).send({error: err.message});
    });

    //on stream closed we can end the request
    archive.on('end', function() {
        console.log('Archive wrote %d bytes', archive.pointer());
    });

    //set the archive name
    res.attachment('db.zip');

    //this is the streaming magic
    archive.pipe(res);

    archive.directory(__dirname + '/../db/', false);
    archive.finalize();
});

app.post( "/import", upload.single('file'), async function ( req, res ) {
    try {
        var dirPath  = __dirname + "/../db.zip";
        var destPath = __dirname + "/../";
        
        var zip = new AdmZip(dirPath);

        // renombrar base de datos actual
        fs.rename(destPath + 'db', destPath + 'db' + Date.now(), function (err) {
            // if (err) throw err;
            
            zip.extractAllTo(destPath + 'db/', true);
            res.sendStatus( 200 )
        });
    } catch (err) {
        res.status( 500 ).send( err );
        console.log(err);
    }
});

app.addCorrelative = async function (documentCode) {
    try {
        var settings = await settingsDB.get('1');
        documentTypes = settings.settings.document_types;

        documentTypes.forEach((element, index) => {
            if (element.code === documentCode) {
                documentTypes[index].next_correlative = parseInt(documentTypes[index].next_correlative) + 1;
            }
        });

        await settingsDB.put({ ...settings, document_types: documentTypes });
    } catch (err) {
        console.log(err);
    }
}

app.getDocumentType = async function (documentCode) {
    var settings = await settingsDB.get('1');
    settings = settings.settings;
    return settings.document_types.find((type) => type.code === documentCode);
}


module.exports = app;
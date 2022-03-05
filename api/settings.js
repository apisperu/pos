const app = require( "express")();
const multer = require("multer");
const fs = require('fs');
const PouchDB = require('pouchdb');
let settingsDB = new PouchDB('db/settings');

const storage = multer.diskStorage({
    destination:  process.env.APPDATA+'/POS/uploads',
    filename: function(req, file, callback){
        callback(null, Date.now() + '.jpg'); // 
    }
});

let upload = multer({storage: storage});

app.get( "/", function ( req, res ) {
    res.send( "Settings API" );
} );

app.get( "/all", function ( req, res ) {
    settingsDB.get('1').then(function (result) {
        res.send( result );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} );
 
app.post( "/", upload.single('imagename'), function ( req, res ) {

    let image = '';

    if(req.body.img != "") {
        image = req.body.img;       
    }

    if(req.file) {
        image = req.file.filename;  
    }

    if(req.body.remove == 1) {
        const path = process.env.APPDATA+"/POS/uploads/"+ req.body.img;
        try {
          fs.unlinkSync(path)
        } catch(err) {
          console.error(err)
        }

        if(!req.file) {
            image = '';
        }
    } 
    
  
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
            "img": image,
            "serie": req.body.serie,
            "numero": req.body.numero,
            "token": req.body.token
        }       
    }
   
    if(req.body.id == "") { 
        settingsDB.put({ _id: '1', ...Settings }).then(function (result) {
            res.sendStatus( 200 )
        }).catch(function (err) {
            res.status( 500 ).send( err );
            console.log(err);
        });
    }
    else { 
        
        settingsDB.get('1').then(function( response ) {
            return settingsDB.put({
                ...Settings,
                _id: '1',
                _rev: response._rev
            });
        }).then(function (result) {
            res.sendStatus( 200 )
        }).catch(function (err) {
            res.status( 500 ).send( err );
            console.log(err);
        });
    }

});

module.exports = app;
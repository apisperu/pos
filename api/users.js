const app = require( "express")();
// const server = require( "http" ).Server( app );
// const bodyParser = require( "body-parser" );
const PouchDB = require('pouchdb');
// const Datastore = require( "nedb" );
const btoa = require('btoa');
// app.use( bodyParser.json() );

const PouchdbFind = require('pouchdb-find');

PouchDB.plugin(PouchdbFind);



let usersDB = new PouchDB(process.env.DB_HOST + 'users');

// let usersDB = new Datastore( {
//     filename: process.env.APPDATA+"/POS/server/databases/users.db",
//     autoload: true
// } );


// usersDB.ensureIndex({ fieldName: '_id', unique: true });


app.get( "/", function ( req, res ) {
    res.send( "Users API" );
} );


  
app.get( "/user/:userId", function ( req, res ) {
    // if ( !req.params.userId ) {
    //     res.status( 500 ).send( "ID field is required." );
    // } else {

    //     usersDB.findOne( {
    //         _id: req.params.userId
    //     }, function ( err, user ) {
    //         res.send( user );
    //     } );
    // }


    if ( !req.params.userId ) {
        res.status( 500 ).send( "ID field is required." );
    } else {
        usersDB.get(req.params.userId).then(function (result) {
            res.send( result );
        }).catch(function (err) {
            res.status( 500 ).send( err );
            console.log(err);
        });
    }

} );



app.get( "/logout/:userId", function ( req, res ) {
    if ( !req.params.userId ) {
        res.status( 500 ).send( "ID field is required." );
    } else { 

        usersDB.get(req.params.userId).then(function( user ) {
            return usersDB.put({
                ...user,
                status: 'Logged Out_'+ new Date(),
            });
        }).then(function( response ) {
            res.sendStatus( 200 );
        }).catch(function( err ) {
            res.status( 500 ).send( err );
            console.log( err );
        });
    }
});



app.post( "/login", function ( req, res ) { 

    usersDB.find({
        selector: {
            username: req.body.username,
            password: btoa(req.body.password)
        },
        limit: 1
    })
    .then(function (result) {
        if (result.docs.length) {
            let user = result.docs[0];
            usersDB.put({
                ...user,
                status: 'Logged In_'+ new Date()
            });
            
            res.send(user)
        }
        res.send(result)
    })
    
} );



app.get( "/all", function ( req, res ) {
    usersDB.allDocs({
        include_docs: true
    }).then(function (result) {
        res.send( result.rows );
    }).catch(function (err) {
        res.status( 500 ).send( err );
        console.log(err);
    });
} );



app.delete( "/user/:userId", function ( req, res ) {
    let id = req.params.userId;

    usersDB.get(id).then(function( user ) {
        return usersDB.remove( user );
    }).then(function (result) {
        res.sendStatus( 200 );
    }).catch(function ( err ) {
        res.status( 500 ).send( err );
        console.log( err );
    })
    
} );

 
app.post( "/post" , function ( req, res ) {   
    console.log(req.body);return;
    let User = { 
            "username": req.body.username,
            "password": btoa(req.body.password),
            "fullname": req.body.fullname,
            "perm_products": req.body.perm_products == "on" ? 1 : 0,
            "perm_categories": req.body.perm_categories == "on" ? 1 : 0,
            "perm_transactions": req.body.perm_transactions == "on" ? 1 : 0,
            "perm_users": req.body.perm_users == "on" ? 1 : 0,
            "perm_settings": req.body.perm_settings == "on" ? 1 : 0,
            "status": ""
        }

    if(req.body.id == "") { 
       User._id = Math.floor(Date.now() / 1000);
       usersDB.insert( User, function ( err, user ) {
            if ( err ) res.status( 500 ).send( req );
            else res.send( user );
        });
    }
    else { 
        usersDB.update( {
            _id: parseInt(req.body.id)
                    }, {
                        $set: {
                            username: req.body.username,
                            password: btoa(req.body.password),
                            fullname: req.body.fullname,
                            perm_products: req.body.perm_products == "on" ? 1 : 0,
                            perm_categories: req.body.perm_categories == "on" ? 1 : 0,
                            perm_transactions: req.body.perm_transactions == "on" ? 1 : 0,
                            perm_users: req.body.perm_users == "on" ? 1 : 0,
                            perm_settings: req.body.perm_settings == "on" ? 1 : 0
                        }
                    }, {}, function (
            err,
            numReplaced,
            user
        ) {
            if ( err ) res.status( 500 ).send( err );
            else res.sendStatus( 200 );
        } );

    }

});


app.get( "/check", function ( req, res ) {
    usersDB.get('1').then(function (result) {
        res.send( result );
    }).catch(function (err) {

        let user = { 
            "_id": '1',
            "username": "admin",
            "password": btoa("admin"),
            "fullname": "Administrator",
            "perm_products": 1,
            "perm_categories": 1,
            "perm_transactions": 1,
            "perm_users": 1,
            "perm_settings": 1,
            "status": ""
        }

        usersDB.put(user);
        console.log(err);
    });
} );

module.exports = app;
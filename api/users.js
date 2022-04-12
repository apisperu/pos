const app = require( "express")();
const PouchDB = require('pouchdb');
const btoa = require('btoa');
const CONFIG = require('../config');
const PouchdbFind = require('pouchdb-find');

PouchDB.plugin(PouchdbFind);

let usersDB = new PouchDB(CONFIG.DB_HOST + 'users');

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
        } else {
            res.send(result)
        }
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

 
app.post( "/post" , async function ( req, res ) {   
    let User = { 
        "username": req.body.username,
        "password": btoa(req.body.password),
        "fullname": req.body.fullname,
        "perm_products": req.body.perm_products == "on" ? 1 : 0,
        "perm_categories": req.body.perm_categories == "on" ? 1 : 0,
        "perm_transactions": req.body.perm_transactions == "on" ? 1 : 0,
        "perm_users": req.body.perm_users == "on" ? 1 : 0,
        "perm_settings": req.body.perm_settings == "on" ? 1 : 0
    }


    if (req.body.id) {

        try {
            var user = await usersDB.get((req.body.id).toString());
            if (!User.password) {
                delete User.password;
            }
            await usersDB.put({ ...user, ...User });
            res.sendStatus( 200 );
        } catch (err) {
            res.status( 500 ).send( err );
            console.log(err);
        }
    } else {
        
        try {
            User._id = (Math.floor(Date.now() / 1000)).toString();
            await usersDB.put({ ...User, "status": "" })
            res.sendStatus( 200 )
        } catch (err) {
            res.status( 500 ).send( err );
            console.log(err);
        }
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
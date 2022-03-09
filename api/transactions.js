let app = require("express")();
let server = require("http").Server(app);
let Inventory = require("./inventory");
const PouchDB = require('pouchdb');
const PouchdbFind = require('pouchdb-find');

PouchDB.plugin(PouchdbFind);

let transactionsDB = new PouchDB('db/transactions');


app.get("/", function(req, res) {
  res.send("Transactions API");
});

 
// app.get("/all", function(req, res) {
//   transactionsDB.allDocs({
//       include_docs: true
//   }).then(function (result) {
//       res.send( result.rows );
//   }).catch(function (err) {
//       res.status( 500 ).send( err );
//       console.log(err);
//   });
// });



 
app.get("/on-hold", function(req, res) {
  transactionsDB.find({
    selector: { $and: [{ ref_number: {$ne: ""}}, { status: 0  }]}
  }).then(function (result) {
    res.send(result)
  })

  // transactionsDB.find(
  //   { $and: [{ ref_number: {$ne: ""}}, { status: 0  }]},    
  //   function(err, docs) {
  //     if (docs) res.send(docs);
  //   }
  // );
});



app.get("/customer-orders", function(req, res) {
  transactionsDB.find({
    selector: { $and: [{ customer: {$ne: "0"} }, { status: 0}, { ref_number: ""}]}
  }).then(function (result) {
    res.send(result)
  })

  // transactionsDB.find(
  //   { $and: [{ customer: {$ne: "0"} }, { status: 0}, { ref_number: ""}]},
  //   function(err, docs) {
  //     if (docs) res.send(docs);
  //   }
  // );
});



app.get("/by-date", function(req, res) {

  let startDate = new Date(req.query.start);
  let endDate = new Date(req.query.end);

  
  if(req.query.user == 0 && req.query.till == 0) {
    transactionsDB.find({
      selector: { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }] }
    }).then(function (result) {
      res.send(result)
    })
      // transactionsDB.find(
      //   { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }] },
      //   function(err, docs) {
      //     if (docs) res.send(docs);
      //   }
      // );
  }

  if(req.query.user != 0 && req.query.till == 0) {
    transactionsDB.find({
      selector: { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }, { user_id: parseInt(req.query.user) }] }
    }).then(function (result) {
      res.send(result)
    })
    
    // transactionsDB.find(
    //   { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }, { user_id: parseInt(req.query.user) }] },
    //   function(err, docs) {
    //     if (docs) res.send(docs);
    //   }
    // );
  }

  if(req.query.user == 0 && req.query.till != 0) {
    transactionsDB.find({
      selector: { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }, { till: parseInt(req.query.till) }] }
    }).then(function (result) {
      res.send(result)
    })

    // transactionsDB.find(
    //   { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }, { till: parseInt(req.query.till) }] },
    //   function(err, docs) {
    //     if (docs) res.send(docs);
    //   }
    // );
  }

  if(req.query.user != 0 && req.query.till != 0) {
    transactionsDB.find({
      selector: { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }, { till: parseInt(req.query.till) }, { user_id: parseInt(req.query.user) }] }
    }).then(function (result) {
      res.send(result)
    })

    // transactionsDB.find(
    //   { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }, { till: parseInt(req.query.till) }, { user_id: parseInt(req.query.user) }] },
    //   function(err, docs) {
    //     if (docs) res.send(docs);
    //   }
    // );
  }

});



app.post("/new", function(req, res) {
  let newTransaction = req.body;
  // transactionsDB.insert(newTransaction, function(err, transaction) {    
  //   if (err) res.status(500).send(err);
  //   else {
  //    res.sendStatus(200);

  //    if(newTransaction.paid >= newTransaction.total){
  //       Inventory.decrementInventory(newTransaction.items);
  //    }
     
  //   }
  // });

  transactionsDB.put({
    ...newTransaction,
    _id: newTransaction._id.toString(),
  }).then(function (result) {
    if(newTransaction.paid >= newTransaction.total){
      Inventory.decrementInventory(newTransaction.items);
    }

    res.sendStatus( 200 )
  }).catch(function (err) {
      res.status( 500 ).send( err );
      console.log(err);
  });
});



app.put("/new", function(req, res) {
  let oderId = req.body._id.toString();
  let newTransaction = req.body;
  
  // transactionsDB.update( {
  //     _id: oderId
  // }, req.body, {}, function (
  //     err,
  //     numReplaced,
  //     order
  // ) {
  //     if ( err ) res.status( 500 ).send( err );
  //     else res.sendStatus( 200 );
  // } );

  transactionsDB.put({
    ...newTransaction,
    _id: oderId,
  }).then(function (result) {
    res.sendStatus( 200 )
  }).catch(function (err) {
      res.status( 500 ).send( err );
      console.log(err);
  });
});


app.post( "/delete", function ( req, res ) {
 let transaction = req.body;
 
  // transactionsDB.remove( {
  //     _id: transaction.orderId
  // }, function ( err, numRemoved ) {
  //     if ( err ) res.status( 500 ).send( err );
  //     else res.sendStatus( 200 );
  // } );

  transactionsDB.get(transaction.orderId)
    .then(doc => transactionsDB.remove(doc))
    .catch(err => console.log(err));

});



app.get("/:transactionId", function(req, res) {
  transactionsDB.find({ _id: req.params.transactionId }, function(err, doc) {
    if (doc) res.send(doc[0]);
  });
});

module.exports = app;
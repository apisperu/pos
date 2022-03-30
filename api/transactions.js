const app = require("express")();
let server = require("http").Server(app);
let Inventory = require("./inventory");
let Settings = require("./settings");
let apisperu = require("../helpers/apisperu");
const PouchDB = require('pouchdb');
const PouchdbFind = require('pouchdb-find');
const apiResults = require('../helpers/apiResults');

PouchDB.plugin(PouchdbFind);

let transactionsDB = new PouchDB(process.env.DB_HOST + 'transactions');

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
});



app.get("/customer-orders", function(req, res) {
  transactionsDB.find({
    selector: { $and: [{ customer: {$ne: 1} }, { status: 0}]}
    // selector: { $and: [{ customer: {$ne: 0} }, { status: 0}, { ref_number: ""}]}
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
      selector: { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }] },
      sort: [{_id: 'desc'}]
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
      selector: { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }, { user_id: req.query.user }] },
      sort: [{id: 'desc'}]
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
      selector: { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }, { till: parseInt(req.query.till) }] },
      sort: [{id: 'desc'}]
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
      selector: { $and: [{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() }}, { status: parseInt(req.query.status) }, { till: parseInt(req.query.till) }, { user_id: req.query.user }] },
      sort: [{id: 'desc'}]
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



app.post("/new", async function(req, res) {
  let newTransaction = req.body;

  // obtener serie y correlativo
  if (newTransaction.document_type && newTransaction.status) {
    let documentType = await Settings.getDocumentType(newTransaction.document_type.code)
    newTransaction.serie = documentType.serie;
    newTransaction.correlative = documentType.next_correlative;
  }

  transactionsDB.put({
    ...newTransaction,
    _id: newTransaction._id.toString(),
  }).then(async function (result) {
    if(newTransaction.paid >= newTransaction.total){
      Inventory.decrementInventory(newTransaction.items);
    }
    
    // Emitir a sunat
    if (newTransaction.document_type && newTransaction.document_type.send_sunat) {
      let json = await apisperu.jsonInvoice(newTransaction);

      apisperu.sendInvoice(json).then(r => {
        apiResults.invoiceResult(r.data, result.id, json)
      }).catch(err => {
        console.log(err);
      });
    }

    // Aumentar al siguiente correlativo
    if (newTransaction.document_type && newTransaction.status) {
      await Settings.addCorrelative(newTransaction.document_type.code)
    }
    
    res.json( newTransaction )
  }).catch(function (err) {
    res.status( 500 ).send( err );
    console.log(err);
  });
});



app.put("/new", async function(req, res) {

  let oderId = req.body._id.toString();
  let newTransaction = req.body;

  // obtener serie y correlativo
  if (newTransaction.document_type && newTransaction.status) {
    let documentType = await Settings.getDocumentType(newTransaction.document_type.code)
    newTransaction.serie = documentType.serie;
    newTransaction.correlative = documentType.next_correlative;
  }

  transactionsDB.get(oderId).then(doc => {
    return transactionsDB.put({
      ...doc,
      ...newTransaction
    });
  }).then(async function(result) {
    if(newTransaction.paid >= newTransaction.total){
      Inventory.decrementInventory(newTransaction.items);
    }

    // Emitir a sunat
    if (newTransaction.document_type && newTransaction.document_type.send_sunat) {
      let json = await apisperu.jsonInvoice(newTransaction);

      apisperu.sendInvoice(json).then(r => {
        apiResults.invoiceResult(r.data, result.id, json)
      }).catch(err => {
        console.log(err);
      });
    }

    // Aumentar al siguiente correlativo
    if (newTransaction.document_type && newTransaction.status) {
      await Settings.addCorrelative(newTransaction.document_type.code)
    }

    res.json( newTransaction )
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

app.post("/:transactionId/xml", async function(req, res) {
  let id  = req.params.transactionId;

  let transaction = await transactionsDB.get(id);

  let json = await apisperu.jsonInvoice(transaction);

  apisperu.xmlInvoice(json).then(r => {
    res.header("Content-Type", "application/xml");
    res.status(200).send(r.data);
  }).catch(err => {
    res.status( 500 ).send( err );
  });
});


module.exports = app;
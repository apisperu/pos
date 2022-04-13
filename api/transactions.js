const app = require("express")();
let server = require("http").Server(app);
let Inventory = require("./inventory");
let Settings = require("./settings");
let apisperu = require("../helpers/apisperu");
const PouchDB = require('pouchdb');
const PouchdbFind = require('pouchdb-find');
const apiResults = require('../helpers/apiResults');
const CONFIG = require('../config');

PouchDB.plugin(PouchdbFind);

let transactionsDB = new PouchDB(CONFIG.DB_HOST + 'transactions');

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
    
    // verificar si el siguiente correlativo ya se está usando.
    // si ya se está usando mostrar alerta 
    let trans = await transactionsDB.find({
      selector: {
        $and: [
          { serie: newTransaction.serie}, 
          { correlative: newTransaction.correlative },
        ]
      },
      limit: 1
    });
    
    if (trans.docs.length) {
      return res.status( 500 ).send( 'Ya existe un documento con la misma serie y el correlativo' );
    }
  }
  
  
  transactionsDB.put({
    ...newTransaction,
    _id: newTransaction._id.toString(),
  }).then(async function (result) {
    
    let transaction = await transactionsDB.get(result.id);

    if(transaction.paid >= transaction.total){
      Inventory.decrementInventory(transaction.items);
    }

    // Aumentar al siguiente correlativo
    if (transaction.document_type && transaction.status) {
      await Settings.addCorrelative(transaction.document_type.code)
    }
    
    // Emitir a sunat
    if (transaction.document_type && transaction.document_type.send_sunat) {
      try {
        
        // boletas
        if (transaction.document_type.code === '03') {
          
          let json = await apisperu.jsonSummary([transaction]);

          if (json.details.length) {
            apisperu.sendSummary(json).then(async r => {
              apiResults.summaryResult(r.data, result.id, json)
            }).catch(err => {
              console.log(err);
            });
          }

        } else {
          let json = await apisperu.jsonInvoice(transaction);

          apisperu.sendInvoice(json).then(r => {
            apiResults.invoiceResult(r.data, result.id, json)
          }).catch(err => {
            console.log(err);
          });
        }
  
      
      } catch (error) {
        console.log(error) 
      }
    }
    
    res.json( transaction )
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

    // Aumentar al siguiente correlativo
    if (newTransaction.document_type && newTransaction.status) {
      await Settings.addCorrelative(newTransaction.document_type.code)
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

app.get("/:transactionId/xml", async function(req, res) {
  let id  = req.params.transactionId;

  let transaction = await transactionsDB.get(id);

  let json = await apisperu.jsonInvoice(transaction);

  apisperu.xmlInvoice(json).then(r => {
    res.end(r.data);
  }).catch(err => {
    res.status( 500 ).send( err );
  });
});


app.get("/:transactionId/pdf", async function(req, res) {
  let id  = req.params.transactionId;

  let transaction = await transactionsDB.get(id);

  let json = await apisperu.jsonInvoice(transaction);
  
  apisperu.pdfInvoice(json).then(r => {
    res.header("Content-Type", "application/pdf");
    res.end(r.data);
  }).catch(err => {
    res.status( 500 ).send( err );
  });
});

app.get("/:transactionId/qr", async function(req, res) {
  let id  = req.params.transactionId;

  let transaction = await transactionsDB.get(id);
  let json = await apisperu.jsonQrSale(transaction);

  apisperu.qrSale(json).then(r => {
    // res.header("Content-Type", "application/pdf");
    res.end(r.data);
  }).catch(err => {
    res.status( 500 ).send( err );
  });
});


app.post( "/invoice/:transactionId", async function ( req, res ) {
  let id  = req.params.transactionId;

  try {
    
    let transaction = await transactionsDB.get(id);
    let json = await apisperu.jsonInvoice(transaction);
  
    apisperu.sendInvoice(json).then(async r => {
      await apiResults.invoiceResult(r.data, id, json)
      res.status( 200 ).json( r.data );
    }).catch(err => {
      console.log(err);
      res.status( 500 ).send( 'No se pudo enviar el comprobante' );
    });

  } catch (error) {
    console.log(error)
    res.status( 500 ).send( error );
  }
  return;
 
});

app.post( "/voided/:transactionId", async function ( req, res ) {
  let id  = req.params.transactionId;

  let transaction = await transactionsDB.get(id);

  let json = await apisperu.jsonVoided([transaction]);

  if (!json.details.length) {
    return res.status( 500 ).send( 'Documento no permitido para comunicacíón de baja' );
  }

  apisperu.sendVoided(json).then(async r => {
    await apiResults.voidedResult(r.data, id, json)
    res.status( 200 ).json( r.data );
  }).catch(err => {
    console.log(err);
    res.status( 500 ).send( 'No se pudo solicitar la comunicación de baja' );
  });
 
});
 
app.post( "/voided/:transactionId/status", async function ( req, res ) {
  let id  = req.params.transactionId;

  let transaction = await transactionsDB.get(id);

  if (!transaction.sunat_response_voided || !transaction.sunat_response_voided.ticket) {
    return res.status( 500 ).send( 'No existe ticket' );
  }

  if (transaction.sunat_state === 'success' || transaction.sunat_state === 'null') {
    return res.status( 500 ).send( 'El comprobante ya se encuentra informado.' );
  }

  let ticket = transaction.sunat_response_voided.ticket

  apisperu.statusVoided(ticket).then(async r => {
    await apiResults.voidedStatusResult(r.data, id)
    res.status( 200 ).json( r.data );
  }).catch(err => {
    console.log(err);
    res.status( 500 ).send( 'No status' );
  });

 
});

app.post( "/summary/:transactionId", async function ( req, res ) {
  let id  = req.params.transactionId;

  try {
    
    let transaction = await transactionsDB.get(id);
    
    let json = await apisperu.jsonSummary([transaction]);
  
    if (!json.details.length) {
      return res.status( 500 ).send( 'Documento no permitido para el resumen diario' );
    }

    apisperu.sendSummary(json).then(async r => {
      await apiResults.summaryResult(r.data, id, json)
      res.status( 200 ).json( r.data );
    }).catch(err => {
      console.log(err);
      res.status( 500 ).send( 'No se pudo enviar el resumen diario' );
    });

  } catch (error) {
    console.log(error)
    res.status( 500 ).send( error );
    
  }
  return;
  
 
});
 
app.post( "/summary/:transactionId/status", async function ( req, res ) {
  let id  = req.params.transactionId;
  let transaction = await transactionsDB.get(id);

  if (!transaction.sunat_response_summary || !transaction.sunat_response_summary.ticket) {
    return res.status( 500 ).send( 'No existe ticket' );
  }

  if (transaction.sunat_state === 'success' || transaction.sunat_state === 'null') {
    return res.status( 500 ).send( 'El comprobante ya se encuentra informado.' );
  }

  let ticket = transaction.sunat_response_summary.ticket

  apisperu.statusSummary(ticket).then(async r => {
    await apiResults.summaryStatusResult(r.data, id, transaction)
    res.status( 200 ).json( r.data );
  }).catch(err => {
    console.log(err);
    res.status( 500 ).send( 'No status' );
  });
 
});

app.post( "/set-nullable/:transactionId", async function ( req, res ) {
  let id  = req.params.transactionId;
  let transaction = await transactionsDB.get(id);

  try {    
    transactionsDB.put({
      ...transaction,
      sunat_state_summary: 3,
      // sunat_state: 'nullable'
    })

    res.status( 200 ).json( transaction );
  } catch (error) {
    res.status( 500 ).send( error );
  }
});

module.exports = app;
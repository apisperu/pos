const moment = require('moment');
const aLetras = require('./numeroALetras')
const axios = require('axios');
const PouchDB = require('pouchdb');
const apiResults = require('./apiResults');
const CONFIG = require('../config');

let settingsDB = new PouchDB(CONFIG.DB_HOST + 'settings');
let transactionsDB = new PouchDB(CONFIG.DB_HOST + 'transactions');


async function jsonInvoice(data){
    let settings = await settingsDB.get('1');
    settings = settings.settings;

    let json = {
        "ublVersion": "2.1",
        "tipoOperacion": "0101",
        "tipoDoc": data.document_type.code,
        "serie": data.serie,
        "correlativo": data.correlative,
        "fechaEmision": moment(new Date(data.date)).format('YYYY-MM-DDTHH:mm:ss-05:00'),
        "formaPago": {
          "moneda": "PEN",
          "tipo": "Contado"
        },
        "tipoMoneda": "PEN",
        "client": {
          "tipoDoc": data.customer.document_type.code,
          "numDoc": data.customer.document_type.number,
          "rznSocial": data.customer.name,
          "address": {
            "direccion": data.customer.address.street,
            "provincia": data.customer.address.state,
            "departamento": data.customer.address.city,
            "distrito": data.customer.address.district,
            "ubigueo": data.customer.address.zip
          }
        },
        "company": {
          "ruc": settings.vat_no,
          "razonSocial": settings.legal_name,
          "nombreComercial": settings.tradename,
          "address": {
            "direccion": settings.address.street,
            "provincia": settings.address.state,
            "departamento": settings.address.city,
            "distrito": settings.address.district,
            "ubigueo": settings.address.zip
          }
        },
        "mtoOperGravadas": data.subtotal,
        "mtoIGV": data.tax,
        "valorVenta": data.subtotal,
        "totalImpuestos": data.tax,
        "subTotal": data.total,
        "mtoImpVenta": data.total,
        "legends": [
          {
            "code": "1000",
            "value": aLetras.numeroALetras(data.total)
          }
        ]
    }

    json.details = [];

    for (let i = 0; i < data.items.length; i++) {
        let item = data.items[i];
        let valorVenta = (parseFloat(item.quantity) * parseFloat(item.price));
        let igv = (valorVenta * settings.percentage) / 100;
        let precioUnitario = (valorVenta + igv) / item.quantity;

        let detail = {
            "codProducto": item.id,
            "unidad": "NIU",
            "descripcion": item.product_name,
            "cantidad": item.quantity,
            "mtoValorUnitario": item.price,
            "mtoValorVenta": valorVenta.toFixed(2),
            "mtoBaseIgv": valorVenta.toFixed(2),
            "porcentajeIgv": settings.percentage,
            "igv": igv.toFixed(2),
            "tipAfeIgv": 10,
            "totalImpuestos": igv.toFixed(2),
            "mtoPrecioUnitario": precioUnitario.toFixed(2)
        };

        // exonerados
        if (!data.tax) {
          detail.porcentajeIgv = 0;
          detail.igv = 0;
          detail.tipAfeIgv = 20;
          detail.totalImpuestos = 0;
          detail.mtoPrecioUnitario = item.price
        }

        json.details.push(detail);
    }

    // exonerados
    if (!data.tax) {
      json.mtoOperGravadas = 0;
      json.mtoOperExoneradas = data.subtotal;
    }

    return json;
}

async function sendInvoice(data){
    let settings = await settingsDB.get('1');
    let token = settings.settings.token;

    return axios.post('https://facturacion.apisperu.com/api/v1/invoice/send', data, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    })
}

async function xmlInvoice(data) {
    let settings = await settingsDB.get('1');
    let token = settings.settings.token;

    return axios.post('https://facturacion.apisperu.com/api/v1/invoice/xml', data, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    })
}

async function pdfInvoice(data) {
  let settings = await settingsDB.get('1');
  let token = settings.settings.token;

  return axios.post('https://facturacion.apisperu.com/api/v1/invoice/pdf', data, {
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
      },
      responseType: 'arraybuffer'
  })
}


async function jsonVoided(invoices) {
  let voidedDate = moment(new Date(moment())).format('YYYYMMDD');

  let fechaGen = moment(new Date(invoices[0].date)).format('YYYY-MM-DDT00:00:00-05:00');
  let fechaCom = moment(new Date(moment())).format('YYYY-MM-DDTHH:mm:ss-05:00');
  let settings = await settingsDB.get('1');
  settings = settings.settings;

  let nextCorrelative = await getNextCorrelativeVoided(voidedDate);

  let json = {
    "correlativo": nextCorrelative,
    "fecGeneracion": fechaGen,
    "fecComunicacion": fechaCom,
    "company": {
      "ruc": settings.vat_no,
      "razonSocial": settings.legal_name,
      "nombreComercial": settings.tradename,
      "address": {
        "direccion": settings.address.street,
        "provincia": settings.address.state,
        "departamento": settings.address.city,
        "distrito": settings.address.district,
        "ubigueo": settings.address.zip
      }
    }
  }

  json.details = [];

  for (let i = 0; i < invoices.length; i++) {
    let item = invoices[i];
    let fechaGenItem = moment(new Date(item.date)).format('YYYY-MM-DDT00:00:00-05:00');
    if (fechaGen === fechaGenItem && item.document_type.code === '01' && item.sunat_state !== 'null') {
      json.details.push({
        "tipoDoc": item.document_type.code,
        "serie": item.serie,
        "correlativo": item.correlative,
        "desMotivoBaja": "ERROR"
      })
    }
  }

  return json;
}

async function sendVoided(data) {
  let settings = await settingsDB.get('1');
  let token = settings.settings.token;

  return axios.post('https://facturacion.apisperu.com/api/v1/voided/send', data, {
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
      }
  })
}

async function statusVoided(ticket) {
  let settings = await settingsDB.get('1');
  let token = settings.settings.token;
  let ruc = settings.settings.vat_no;

  return axios.get('https://facturacion.apisperu.com/api/v1/voided/status?ticket=' + ticket + '&ruc=' + ruc, {
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
      }
  })
}


async function getNextCorrelativeVoided(date) {
  try {

    let transaction = await transactionsDB.find({
      selector: { voided_date: date, voided_correlative: {$exists: true} },
      sort: [{'_id': 'desc'}],
      limit: 1
    });

    let correlative = 1;

    if (transaction.docs.length) {
      correlative = transaction.docs[0].voided_correlative + 1
    }

    return correlative;

  } catch (error) {
    console.log(error)
  }
}


async function jsonSummary(invoices) {
  let summaryDate = moment(new Date(moment())).format('YYYYMMDD');

  let fechaGen = moment(new Date(invoices[0].date)).format('YYYY-MM-DDT00:00:00-05:00');
  let fechaRes = moment(new Date(moment())).format('YYYY-MM-DDTHH:mm:ss-05:00');
  let settings = await settingsDB.get('1');
  settings = settings.settings;

  let nextCorrelative = await getNextCorrelativeSummary(summaryDate);

  let json = {
    "correlativo": nextCorrelative,
    "fecGeneracion": fechaGen,
    "fecResumen": fechaRes,
    "moneda": "PEN",
    "company": {
      "ruc": settings.vat_no,
      "razonSocial": settings.legal_name,
      "nombreComercial": settings.tradename,
      "address": {
        "direccion": settings.address.street,
        "provincia": settings.address.state,
        "departamento": settings.address.city,
        "distrito": settings.address.district,
        "ubigueo": settings.address.zip
      }
    }
  }

  json.details = [];

  for (let i = 0; i < invoices.length; i++) {
    let item = invoices[i];
    let fechaGenItem = moment(new Date(item.date)).format('YYYY-MM-DDT00:00:00-05:00');
    if (fechaGen === fechaGenItem && item.document_type.code === '03' && item.sunat_state !== 'null') {
      let estado = item.sunat_state_summary ? item.sunat_state_summary : 1;
      
      json.details.push({
        "tipoDoc": item.document_type.code,
        "serieNro": item.serie + '-' + item.correlative,
        "estado": estado,
        "clienteTipo": item.customer.document_type.code,
        "clienteNro": item.customer.document_type.number,
        "total": item.total,
        "mtoOperGravadas": item.subtotal,
        "mtoOperInafectas": 0,
        "mtoOperExoneradas": 0,
        "mtoOperExportacion": 0,
        "mtoOtrosCargos": 0,
        "mtoIGV": item.tax
      })
    }
  }

  return json;
}

async function sendSummary(data) {
  let settings = await settingsDB.get('1');
  let token = settings.settings.token;

  return axios.post('https://facturacion.apisperu.com/api/v1/summary/send', data, {
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
      }
  })
}

async function statusSummary(ticket) {
  let settings = await settingsDB.get('1');
  let token = settings.settings.token;
  let ruc = settings.settings.vat_no;

  return axios.get('https://facturacion.apisperu.com/api/v1/summary/status?ticket=' + ticket + '&ruc=' + ruc, {
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
      }
  })
}

async function getNextCorrelativeSummary(date) {
  try {

    let transaction = await transactionsDB.find({
      selector: { summary_date: date, summary_correlative: {$exists: true} },
      sort: [{'_id': 'desc'}],
      limit: 1
    });

    let correlative = 1;

    if (transaction.docs.length) {
      correlative = transaction.docs[0].summary_correlative + 1
    }

    return correlative;

  } catch (error) {
    console.log(error)
  }
}

async function jsonQrSale(invoice) {
  let date = moment(new Date(invoice.date)).format('YYYY-MM-DDTHH:mm:ss-05:00');
  
  let settings = await settingsDB.get('1');
  let ruc = settings.settings.vat_no;

  json = {
    "ruc": ruc,
    "tipo": invoice.document_type.code,
    "serie": invoice.serie,
    "numero": invoice.correlative,
    "emision": date,
    "igv": invoice.tax,
    "total": invoice.total,
    "clienteTipo": invoice.customer ? invoice.customer.document_type.code : '',
    "clienteNumero": invoice.customer.document_type.number
  }

  return json;
}

async function qrSale(data) {
  let settings = await settingsDB.get('1');
  let token = settings.settings.token;

  return axios.post('https://facturacion.apisperu.com/api/v1/sale/qr', data, {
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
      }
  })
}

async function sendPending(job) {
  if (job.taskRunning) {
    return
  }
  
  // send = summary
  // nullable = voided
  // register = invoice || summary

  job.taskRunning = true
  let daysAgo = moment().subtract(3, 'days');

  // send = summary
  let transactions = await transactionsDB.find({
    selector: {
      $and: [{ sunat_state: { $in: ['send'] } }, { date: { $gte: daysAgo.toJSON() }}] 
    },
    sort: [{'_id': 'desc'}],
  });

  if (transactions.docs.length) {
    for (let i = 0; i < transactions.docs.length; i++) {
      const element = transactions.docs[i];

      console.log('Consultar transacción summary: ' + element._id)
      if (element.sunat_response_summary && element.sunat_response_summary.ticket) {
        let ticket = element.sunat_response_summary.ticket;
        await statusSummary(ticket).then(async r => {
          await apiResults.summaryStatusResult(r.data, element._id)
        }).catch(err => {
          console.log(err)
        })
      }
    }
  }
  

  // nullable = voided
  let transactionsV = await transactionsDB.find({
    selector: {
      $and: [{ sunat_state: { $in: ['nullable'] } }, { date: { $gte: daysAgo.toJSON() }}] 
    },
    sort: [{'_id': 'desc'}],
  });

  if (transactionsV.docs.length) {
    for (let i = 0; i < transactionsV.docs.length; i++) {
      const element = transactionsV.docs[i];
      
      console.log('Consultar transacción voided: ' + element._id)
      if (element.sunat_response_voided && element.sunat_response_voided.ticket) {
        let ticket = element.sunat_response_voided.ticket;
        await statusVoided(ticket).then(async r => {
          await apiResults.voidedStatusResult(r.data, element._id)
        }).catch(err => {
          console.log(err)
        })
      }
    }
  }

  job.taskRunning = false
}

async function getDniRuc(type, number){
  let settings = await settingsDB.get('1');
  let token = settings.settings.token_consulta;

  let typeDoc = 'dni';
  
  if (type === '6') {
    typeDoc = 'ruc';
  }

  return axios.get('https://dniruc.apisperu.com/api/v1/' + typeDoc + '/' + number + '?token=' + token, {
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
      }
  })
}


module.exports = {
    jsonInvoice,
    sendInvoice,
    xmlInvoice,
    pdfInvoice,
    jsonVoided,
    sendVoided,
    statusVoided,
    jsonSummary,
    sendSummary,
    statusSummary,
    sendPending,
    jsonQrSale,
    qrSale,
    getDniRuc
}
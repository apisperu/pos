const dotenv = require('dotenv');
const moment = require('moment');
const aLetras = require('./numeroALetras')
const axios = require('axios');
const PouchDB = require('pouchdb');
let settingsDB = new PouchDB(process.env.DB_HOST + 'settings');


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

        json.details.push({
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
        })
        
    }

    if (settings.charge_tax) {

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

function fetchBaja(data, token){
  return fetch('https://facturacion.apisperu.com/api/v1/voided/send', {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json',
      'Authorization': token
      },
      body: JSON.stringify(data)
  })
}

async function configBaja(id, fecha){

  let date = new Date(fecha);
  let fechaBoleta = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}T00:00:00-22:00`;
  
  const JSONBaja = {
    "correlativo": id,
    "fecGeneracion": fechaBoleta,
    "fecComunicacion": fechaBoleta,
    "company": {
      "ruc": 10064782261,
      "razonSocial": "Raúl Fernando Luna Toro",
      "nombreComercial": "ewforex.net",
      "address": {
        "direccion": "Av del éjercito 768, Miraflores",
        "provincia": "LIMA",
        "departamento": "LIMA",
        "distrito": "LIMA",
        "ubigueo": "150101"
      }
    },
    "details": [
      {
        "tipoDoc": "01",
        "serie": "F001",
        "correlativo": id,
        "desMotivoBaja": "ANULADO"
      },
    ]
  }

  return fetcBaja(JSONBaja, token);
}

async function configPdf(data){

  const boletaData = {
    "ublVersion": "2.1",
    "tipoOperacion": "0101",
    "tipoDoc": "03",
    "serie": "B001",
    "correlativo": data.correlative_sunat,
    "fechaEmision": `${year}-${mes}-${dia}T${hora}:${minutos}:${segundos}-05:00`,
    "formaPago": {
      "moneda": "PEN",
      "tipo": "Contado"
    },
    "tipoMoneda": "PEN",
    "client": {
      "tipoDoc": data.cliente[0],
      "numDoc": data.cliente[1],
      "rznSocial": data.cliente[2],
      "address": {
        "direccion": "LIMA",
        "provincia": "LIMA",
        "departamento": "LIMA",
        "distrito": "LIMA",
        "ubigueo": "150101"
      }
    },
    "company": {
      "ruc": 10064782261,
      "razonSocial": "Raúl Fernando Luna Toro",
      "nombreComercial": "ewforex.net",
      "address": {
        "direccion": "Av del éjercito 768, Miraflores",
        "provincia": "LIMA",
        "departamento": "LIMA",
        "distrito": "LIMA",
        "ubigueo": "150101"
      }
    },
    "mtoOperExoneradas": data.rec_operacion,
    "mtoIGV": 0,
    "valorVenta": data.rec_operacion,
    "totalImpuestos": 0,
    "subTotal": data.rec_operacion,
    "mtoImpVenta": data.rec_operacion,
    "details": [
      {
        "codProducto": "P001",
        "unidad": "NIU",
        "descripcion": tipo,
        "cantidad": data.mon_operacion,
        "mtoValorUnitario": data.cot_operacion,
        "mtoValorVenta": data.rec_operacion,
        "mtoBaseIgv": data.rec_operacion,
        "porcentajeIgv": 0,
        "igv": 0,
        "tipAfeIgv": 20,
        "totalImpuestos": 0,
        "mtoPrecioUnitario": data.cot_operacion
      }
    ],
    "legends": [
      {
        "code": "1000",
        "value": montoT
      }
    ]
}

  return apiPdf(boletaData, token);
}

function fetchPdf(data, token){
  return fetch('https://facturacion.apisperu.com/api/v1/invoice/pdf', {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json',
      'Authorization': token
      },
      body: JSON.stringify(data)
  })
}

function formatDate(date){
    
  return formatDate;
}

module.exports = {
    jsonInvoice,
    sendInvoice,
    xmlInvoice,
    pdfInvoice
}
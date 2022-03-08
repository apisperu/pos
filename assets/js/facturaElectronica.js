const dotenv = require('dotenv');


function configFatura(data){
    
    const boletaData = {
        "ublVersion": "2.1",
        "tipoOperacion": "0101",
        "tipoDoc": "03",
        "serie": "B001",
        "correlativo": data.correlativo,
        "fechaEmision": new Date("Y-m-dTH:i:s"),
        "formaPago": {
          "moneda": "PEN",
          "tipo": "Contado"
        },
        "tipoMoneda": "PEN",
        "client": {
          "tipoDoc": String(data.cliente[0]),
          "numDoc": Number(data.cliente[1]),
          "rznSocial": String(data.cliente[2]),
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
        "mtoOperExoneradas": data.recibe,
        "mtoIGV": 0,
        "valorVenta": data.recibe,
        "totalImpuestos": 0,
        "subTotal": data.recibe,
        "mtoImpVenta": data.recibe,
        "details": [
          {
            "codProducto": "P001",
            "unidad": "NIU",
            "descripcion": data.tipo,
            "cantidad": data.monto,
            "mtoValorUnitario": data.cotizacion,
            "mtoValorVenta": data.recibe,
            "mtoBaseIgv": data.recibe,
            "porcentajeIgv": 0,
            "igv": 0,
            "tipAfeIgv": 20,
            "totalImpuestos": 0,
            "mtoPrecioUnitario": data.cotizacion
          }
        ],
        "legends": [
          {
            "code": "1000",
            "value": data.montoT
          }
        ]
    }
    console.log(boletaData)
    return boletaData;
}

function fetchFactura(data, token){
    return fetch('https://facturacion.apisperu.com/api/v1/invoice/send', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': token
        },
        body: JSON.stringify(data)
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

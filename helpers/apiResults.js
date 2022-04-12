const moment = require('moment');
const PouchDB = require('pouchdb');
const CONFIG = require('../config');

let transactionsDB = new PouchDB(CONFIG.DB_HOST + 'transactions');
let logsDB = new PouchDB(CONFIG.DB_HOST + 'logs');

async function invoiceResult(result, id, json) {

    let transaction = await transactionsDB.get(id);

    if (!result.sunatResponse) {
        
        if (transaction.sunat_state !== 'success'|| transaction.sunat_state !== 'null') {
            await transactionsDB.put({
                ...transaction,
                sunat_json: json,
                sunat_state: 'register'
            });
        }

        return;
    }
    if (!result.sunatResponse.success) {
        if (transaction.sunat_state !== 'success'|| transaction.sunat_state !== 'null') {
            await transactionsDB.put({
                ...transaction,
                sunat_json: json,
                sunat_state: 'observed',
                sunat_response: result.sunatResponse
            });

            if (result.sunatResponse.error) {
                logsDB.put({
                    _id: (Math.floor(Date.now() / 1000)).toString(),
                    date: moment().toJSON(),
                    transaction: id,
                    name: 'invoice/send|Enviar una Factura o Boleta',
                    description: result.sunatResponse.error.code + '|' + result.sunatResponse.error.message,
                    type: 'error'
                }).catch(err => console.log(err))
            }
        }

        return;
    }
    if (result.sunatResponse.cdrResponse && result.sunatResponse.cdrResponse.code !== '0') {
        if (transaction.sunat_state !== 'success'|| transaction.sunat_state !== 'null') {
            await transactionsDB.put({
                ...transaction,
                sunat_json: json,
                sunat_state: 'observed',
                sunat_response: result.sunatResponse
            });

            if (result.sunatResponse.error) {
                logsDB.put({
                    _id: (Math.floor(Date.now() / 1000)).toString(),
                    date: moment().toJSON(),
                    transaction: id,
                    name: 'invoice/send|Enviar una Factura o Boleta',
                    description: result.sunatResponse.error.code + '|' + result.sunatResponse.error.message,
                    type: 'error'
                }).catch(err => console.log(err))
            }
        }

        return;
    }

    await transactionsDB.put({
        ...transaction,
        sunat_json: json,
        sunat_state: 'success',
        sunat_response: result.sunatResponse,
        sunat_hash: result.hash
    });

    if (result.sunatResponse.cdrResponse) {
        logsDB.put({
            _id: (Math.floor(Date.now() / 1000)).toString(),
            date: moment().toJSON(),
            transaction: id,
            name: 'invoice/send|Enviar una Factura o Boleta',
            description: result.sunatResponse.cdrResponse.code + '|' + result.sunatResponse.cdrResponse.description,
            type: 'success'
        }).catch(err => console.log(err))
    }

}

async function voidedResult(result, id, json) {
    let transaction = await transactionsDB.get(id);
    
    if (!result.sunatResponse) {
        return;
    }

    if (!result.sunatResponse.success) {
        if (transaction.sunat_state !== 'null') {
            var response = await transactionsDB.put({
                ...transaction,
                sunat_response_voided: result.sunatResponse
            });
        }

        if (result.sunatResponse.error) {
            logsDB.put({
                _id: (Math.floor(Date.now() / 1000)).toString(),
                date: moment().toJSON(),
                transaction: id,
                name: 'voided/send|Enviar una Comunicación de Bajas',
                description: result.sunatResponse.error.code + '|' + result.sunatResponse.error.message,
                type: 'error'
            }).catch(err => console.log(err))
        }

        return;
    }

    let dateCom = moment(new Date(json.fecComunicacion)).format("YYYYMMDD");

    await transactionsDB.put({
        ...transaction,
        sunat_state: 'nullable',
        voided_correlative: json.correlativo,
        voided_date: dateCom,
        sunat_response_voided: result.sunatResponse,
        sunat_hash_voided: result.hash
    });

    if (result.sunatResponse) {
        logsDB.put({
            _id: (Math.floor(Date.now() / 1000)).toString(),
            date: moment().toJSON(),
            transaction: id,
            name: 'voided/send|Enviar una Comunicación de Bajas',
            description: 'Ticket Generado ' + result.sunatResponse.ticket,
            type: 'success'
        }).catch(err => console.log(err))
    }
}

async function voidedStatusResult(result, id, json) {
    let transaction = await transactionsDB.get(id);

    if (!result.success) {
        if (transaction.sunat_state !== 'null') {
            await transactionsDB.put({
                ...transaction,
                sunat_response_voided_status: result
            });
        }

        if (result) {
            logsDB.put({
                _id: (Math.floor(Date.now() / 1000)).toString(),
                date: moment().toJSON(),
                transaction: id,
                name: 'voided/status|Estado del Ticket Comunicación de Bajas',
                description: result.error.code + '|' + result.error.message,
                type: 'error'
            }).catch(err => console.log(err))
        }

        return;
    }

    await transactionsDB.put({
        ...transaction,
        sunat_state: 'null',
        sunat_response_voided_status: result,
    });

    logsDB.put({
        _id: (Math.floor(Date.now() / 1000)).toString(),
        transaction: id,
        name: 'voided/status|Estado del Ticket Comunicación de Bajas',
        description: result.cdrResponse.code + '|' + result.cdrResponse.description,
        type: 'success'
    }).catch(err => console.log(err))
    
}

async function summaryResult(result, id, json) {
    let transaction = await transactionsDB.get(id);
    
    if (!result.sunatResponse) {
        return;
    }

    if (!result.sunatResponse.success) {
        if (transaction.sunat_state !== 'null') {
            var response = await transactionsDB.put({
                ...transaction,
                sunat_response_summary: result.sunatResponse
            });
        }

        if (result.sunatResponse.error) {
            logsDB.put({
                _id: (Math.floor(Date.now() / 1000)).toString(),
                date: moment().toJSON(),
                transaction: id,
                name: 'summary/send|Enviar un resumen diario de boletas de venta electrónicas y notas electrónicas',
                description: result.sunatResponse.error.code + '|' + result.sunatResponse.error.message,
                type: 'error'
            }).catch(err => console.log(err))
        }

        return;
    }
    let dateRes = moment(new Date(json.fecResumen)).format("YYYYMMDD");

    await transactionsDB.put({
        ...transaction,
        sunat_state: 'send',
        summary_correlative: json.correlativo,
        summary_date: dateRes,
        sunat_response_summary: result.sunatResponse,
        sunat_hash_summary: result.hash
    });

    if (result.sunatResponse) {
        logsDB.put({
            _id: (Math.floor(Date.now() / 1000)).toString(),
            date: moment().toJSON(),
            transaction: id,
            name: 'summary/send|Enviar un resumen diario de boletas de venta electrónicas y notas electrónicas',
            description: 'Ticket Generado ' + result.sunatResponse.ticket,
            type: 'success'
        }).catch(err => console.log(err))
    }
}

async function summaryStatusResult(result, id) {
    let transaction = await transactionsDB.get(id);

    if (!result.success) {
        if (transaction.sunat_state !== 'success' || transaction.sunat_state !== 'null') {
            await transactionsDB.put({
                ...transaction,
                sunat_state: 'observed',
                sunat_response_summary_status: result
            });
        }

        if (result) {
            logsDB.put({
                _id: (Math.floor(Date.now() / 1000)).toString(),
                date: moment().toJSON(),
                transaction: id,
                name: 'summary/status|Estado del Ticket Resumen diario de boletas de venta electrónicas y notas electrónicas',
                description: result.error.code + '|' + result.error.message,
                type: 'error'
            }).catch(err => console.log(err))
        }

        return;
    }

    if (result.cdrResponse && result.cdrResponse.code !== '0') {
        if (transaction.sunat_state !== 'success'|| transaction.sunat_state !== 'null') {
            await transactionsDB.put({
                ...transaction,
                sunat_state: 'observed',
                sunat_response_summary_status: result
            });
        }

        logsDB.put({
            _id: (Math.floor(Date.now() / 1000)).toString(),
            date: moment().toJSON(),
            transaction: id,
            name: 'summary/status|Estado del Ticket Resumen diario de boletas de venta electrónicas y notas electrónicas',
            description: result.cdrResponse.code + '|' + result.cdrResponse.description,
            type: 'error'
        }).catch(err => console.log(err))
        

        return;
    }

    let state = transaction.sunat_state_summary === 3 ? 'null' : 'success';

    await transactionsDB.put({
        ...transaction,
        sunat_state: state,
        sunat_response_summary_status: result,
    });

    logsDB.put({
        _id: (Math.floor(Date.now() / 1000)).toString(),
        date: moment().toJSON(),
        transaction: id,
        name: 'summary/status|Estado del Ticket Resumen diario de boletas de venta electrónicas y notas electrónicas',
        description: result.cdrResponse.code + '|' + result.cdrResponse.description,
        type: 'success'
    }).catch(err => console.log(err))
}

module.exports = {
    invoiceResult,
    voidedResult,
    voidedStatusResult,
    summaryResult,
    summaryStatusResult
}
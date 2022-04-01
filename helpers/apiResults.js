const moment = require('moment');
const PouchDB = require('pouchdb');
let transactionsDB = new PouchDB(process.env.DB_HOST + 'transactions');

async function invoiceResult(result, id, json) {

    let transaction = await transactionsDB.get(id);

    if (!result.sunatResponse) {
        
        if (transaction.sunat_state !== 'success'|| transaction.sunat_state !== 'null') {
            var response = await transactionsDB.put({
                ...transaction,
                sunat_json: json,
                sunat_state: 'register'
            });
        }

        return;
    }
    if (!result.sunatResponse.success) {
        if (transaction.sunat_state !== 'success'|| transaction.sunat_state !== 'null') {
            var response = await transactionsDB.put({
                ...transaction,
                sunat_json: json,
                sunat_state: 'observed',
                sunat_response: result.sunatResponse
            });
        }

        return;
    }
    if (result.sunatResponse.cdrResponse && result.sunatResponse.cdrResponse.code !== '0') {
        if (transaction.sunat_state !== 'success'|| transaction.sunat_state !== 'null') {
            var response = await transactionsDB.put({
                ...transaction,
                sunat_json: json,
                sunat_state: 'observed',
                sunat_response: result.sunatResponse
            });
        }

        return;
    }

    var response = await transactionsDB.put({
        ...transaction,
        sunat_json: json,
        sunat_state: 'success',
        sunat_response: result.sunatResponse,
        sunat_hash: result.hash
    });
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
        return;
    }

    await transactionsDB.put({
        ...transaction,
        sunat_state: 'null',
        sunat_response_voided_status: result,
    });
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
}

async function summaryStatusResult(result, id, json) {
    let transaction = await transactionsDB.get(id);

    if (!result.success) {
        if (transaction.sunat_state !== 'success' || transaction.sunat_state !== 'null') {
            await transactionsDB.put({
                ...transaction,
                sunat_state: 'observed',
                sunat_response_summary_status: result
            });
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

        return;
    }

    let state = json.sunat_state_summary === 3 ? 'null' : 'success';

    await transactionsDB.put({
        ...transaction,
        sunat_state: state,
        sunat_response_summary_status: result,
    });
}

module.exports = {
    invoiceResult,
    voidedResult,
    voidedStatusResult,
    summaryResult,
    summaryStatusResult
}
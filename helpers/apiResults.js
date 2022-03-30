
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

module.exports = {
    invoiceResult
}
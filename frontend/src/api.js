import axios from 'axios'

export async function fetchData() {
	// Expected backend endpoint: GET /api/data
	const res = await axios.get('/api/data')
	return res.data
}

export async function fetchPredictions() {
	// Expected backend endpoint: GET /api/predictions
	const res = await axios.get('/api/predictions')
	return res.data
}

export async function uploadDataFile(file) {
	// Expected backend endpoint: POST /api/upload (multipart/form-data)
	const form = new FormData()
	form.append('file', file)

	const res =
		await axios.post('/api/upload', form,
						 {headers : {'Content-Type' : 'multipart/form-data'}})

	return res.data
}

export async function verifyTransaction(transactionData) {
	// Expected backend endpoint: POST /api/verify-transaction
	const res = await axios.post('/api/verify-transaction', transactionData)
	return res.data
}

export async function fetchTransactions() {
	// Expected backend endpoint: GET /api/transactions
	const res = await axios.get('/api/transactions')
	return res.data
}

export async function sendChatMessage(message, conversationHistory = []) {
	// Expected backend endpoint: POST /api/chat
	const res =
		await axios.post('/api/chat', {message, history : conversationHistory})
	return res.data
}

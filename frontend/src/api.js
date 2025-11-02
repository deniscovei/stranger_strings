import axios from 'axios'

export async function fetchData(page = 1, pageSize = 100, search = '', filter = 'all') {
	// Expected backend endpoint: GET /api/data?page=1&pageSize=100&search=...&filter=...
	try{
		const params = { page, pageSize }
		if (search) params.search = search
		if (filter && filter !== 'all') params.filter = filter
		
		const res = await axios.get('/api/data', { params })
		return res.data // Returns { data: [...], pagination: {...} }
	} catch (err) {
		console.error('Error in fetchData:', err.response || err.message || err);
		throw err;
	}
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
	// Backend endpoint: POST /api/predict (proxied to
	// http://localhost:5000/predict)
	const res =
		await axios.post('/api/predict', transactionData,
						 {headers : {'Content-Type' : 'application/json'}})
	return res.data
}

export async function fetchChartData() {
	// Expected backend endpoint: GET /charts/data
	const res = await axios.get('/charts/data')
	return res.data
}

export async function fetchChartSummary() {
	// Expected backend endpoint: GET /charts/summary
	const res = await axios.get('/charts/summary')
	return res.data
}

export async function fetchTransactions() {
	// Expected backend endpoint: GET /api/transactions
	const res = await axios.get('/api/transactions')
	return res.data
}

export async function clearData() {
	const res = await axios.post('/api/clear')
	return res
}

export async function fetchMerchants(page = 1, pageSize = 100, search = '', filter = 'all') {
	// Expected backend endpoint: GET /api/merchants?page=1&pageSize=100&search=...&filter=...
	try {
		const params = { page, pageSize }
		if (search) params.search = search
		if (filter && filter !== 'all') params.filter = filter
		
		const res = await axios.get('/api/merchants', { params })
		return res.data // Returns { data: [...], pagination: {...} }
	} catch (err) {
		console.error('Error in fetchMerchants:', err.response || err.message || err);
		throw err;
	}
}

export async function fetchMerchantTransactions(merchantName, page = 1, pageSize = 20) {
	// Expected backend endpoint: GET /api/merchants/:merchantName/transactions
	try {
		const params = { page, pageSize }
		const encodedName = encodeURIComponent(merchantName)
		const res = await axios.get(`/api/merchants/${encodedName}/transactions`, { params })
		return res.data // Returns { data: [...], pagination: {...} }
	} catch (err) {
		console.error('Error in fetchMerchantTransactions:', err.response || err.message || err);
		throw err;
	}
}

export async function sendChatMessage(message) {
	// Backend endpoint: POST /api/chat (proxied to http://localhost:5000/chat)
	// Sends: {"message": "..."}
	// Returns: string response from AI
	// Timeout set to 15 seconds for AI response
	const res = await axios.post('/api/chat', {message}, {
		headers : {'Content-Type' : 'application/json'},
		timeout : 60000 // 60 seconds
	})
	// Backend returns a plain string, so res.data is the AI response
	return res.data
}

export async function generateAIChart(prompt) {
	// Backend endpoint: POST /api/generate-chart
	// Sends: {"prompt": "..."}
	// Returns: { data: {...}, type: 'bar'|'line'|'pie' }
	const res = await axios.post('/api/generate-chart', { prompt }, {
		headers: { 'Content-Type': 'application/json' },
		timeout: 60000 // 60 seconds for AI to generate chart
	})
	return res.data
}

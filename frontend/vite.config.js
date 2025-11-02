import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

export default defineConfig({
	plugins : [ react() ],
	server : {
		port : 5173,
		proxy : {
			'/api' : {
				target : 'http://localhost:5000',
				changeOrigin : true,
				secure : false,
				rewrite : (path) => path.replace(/^\/api/, ''),
			},
			'/charts' : {
				target : 'http://localhost:5000',
				changeOrigin : true,
				secure : false,
			},
			'/sql' : {
				target : 'http://localhost:5000',
				changeOrigin : true,
				secure : false,
			},
		},
	},
})

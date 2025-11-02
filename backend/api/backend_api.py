from flask import Flask
from flask_cors import CORS
import os
from config import load_model

from routes import health_bp, predict_bp, claudiu_bp, charts_bp, data_bp, sql_query_bp

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Load model at startup
load_model()

# Register blueprints
app.register_blueprint(health_bp)
app.register_blueprint(predict_bp)
app.register_blueprint(claudiu_bp)
app.register_blueprint(data_bp)
app.register_blueprint(charts_bp)
app.register_blueprint(sql_query_bp)

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)

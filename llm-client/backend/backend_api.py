from flask import Flask
import os
from config import load_model
from routes import health_bp, predict_bp, claudiu_bp, data_bp
from db.database import db

app = Flask(__name__)

# Initialize database
db.init_db()

# Load model at startup
load_model()

# Register blueprints
app.register_blueprint(health_bp)
app.register_blueprint(predict_bp)
app.register_blueprint(claudiu_bp)
app.register_blueprint(data_bp)

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)

from flask import Blueprint, jsonify
import sys
import os

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import get_model

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    model = get_model()
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
    })

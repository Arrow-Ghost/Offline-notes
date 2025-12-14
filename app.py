"""
Flask Backend for Notes App
Handles authentication and notes synchronization
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import os
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///notes.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
# Configure CORS to allow all origins (for development)
# In production, specify exact origins
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# ============================================
# Database Models
# ============================================

class User(db.Model):
    """User model"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    notes = db.relationship('Note', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """Check password"""
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'created_at': self.created_at.isoformat()
        }


class Note(db.Model):
    """Note model"""
    __tablename__ = 'notes'
    
    id = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(500), nullable=False, default='Untitled')
    content = db.Column(db.Text, nullable=True)
    tags = db.Column(db.JSON, nullable=True, default=list)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)
    deleted = db.Column(db.Boolean, default=False, index=True)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content or '',
            'tags': self.tags or [],
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'deleted': self.deleted
        }


# ============================================
# Helper Functions
# ============================================

def get_current_user():
    """Get current authenticated user"""
    user_id = get_jwt_identity()
    return User.query.get(user_id)


def generate_note_id():
    """Generate unique note ID"""
    return f"{int(datetime.utcnow().timestamp() * 1000)}-{os.urandom(4).hex()}"


# ============================================
# Authentication Routes
# ============================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        name = data.get('name', '')

        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400

        # Check if user exists
        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'User already exists'}), 400

        # Create user
        user = User(email=email, name=name)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        # Generate token
        access_token = create_access_token(identity=user.id)

        return jsonify({
            'token': access_token,
            'user': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400

        # Find user
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            return jsonify({'message': 'Invalid credentials'}), 401

        # Generate token
        access_token = create_access_token(identity=user.id)

        return jsonify({
            'token': access_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================
# Notes Routes
# ============================================

@app.route('/api/notes', methods=['GET'])
@jwt_required()
def get_notes():
    """Get all notes for current user"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Get all non-deleted notes
        notes = Note.query.filter_by(
            user_id=user.id,
            deleted=False
        ).order_by(Note.updated_at.desc()).all()

        return jsonify([note.to_dict() for note in notes]), 200

    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/notes', methods=['POST'])
@jwt_required()
def create_note():
    """Create new note"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'message': 'User not found'}), 404

        data = request.get_json()
        
        # Generate note ID
        note_id = generate_note_id()
        
        # If localId provided, use it (for mapping local to server ID)
        if data.get('localId'):
            note_id = data.get('localId')

        note = Note(
            id=note_id,
            user_id=user.id,
            title=data.get('title', 'Untitled'),
            content=data.get('content', ''),
            tags=data.get('tags', [])
        )

        db.session.add(note)
        db.session.commit()

        return jsonify(note.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500


@app.route('/api/notes/<note_id>', methods=['GET'])
@jwt_required()
def get_note(note_id):
    """Get single note"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'message': 'User not found'}), 404

        note = Note.query.filter_by(id=note_id, user_id=user.id, deleted=False).first()

        if not note:
            return jsonify({'message': 'Note not found'}), 404

        return jsonify(note.to_dict()), 200

    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/notes/<note_id>', methods=['PUT'])
@jwt_required()
def update_note(note_id):
    """Update note"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'message': 'User not found'}), 404

        note = Note.query.filter_by(id=note_id, user_id=user.id, deleted=False).first()

        if not note:
            return jsonify({'message': 'Note not found'}), 404

        data = request.get_json()
        
        # Update fields
        if 'title' in data:
            note.title = data['title']
        if 'content' in data:
            note.content = data['content']
        if 'tags' in data:
            note.tags = data['tags']
        
        note.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify(note.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500


@app.route('/api/notes/<note_id>', methods=['DELETE'])
@jwt_required()
def delete_note(note_id):
    """Delete note (soft delete)"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'message': 'User not found'}), 404

        note = Note.query.filter_by(id=note_id, user_id=user.id).first()

        if not note:
            return jsonify({'message': 'Note not found'}), 404

        # Soft delete
        note.deleted = True
        note.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({'message': 'Note deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500


# ============================================
# Health Check
# ============================================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200


# ============================================
# Error Handlers
# ============================================

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'message': 'Token has expired'}), 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'message': 'Invalid token'}), 401


@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({'message': 'Authorization required'}), 401


# ============================================
# Initialize Database
# ============================================

def create_tables():
    """Create database tables"""
    with app.app_context():
        db.create_all()


# ============================================
# Run App
# ============================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)


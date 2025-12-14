#!/usr/bin/env python3
"""
Quick script to check if backend is running and accessible
"""

import requests
import sys

def check_backend():
    try:
        response = requests.get('http://localhost:5000/api/health', timeout=2)
        if response.status_code == 200:
            print("✅ Backend is running and accessible!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend at http://localhost:5000")
        print("   Make sure the backend server is running:")
        print("   cd backend && python app.py")
        return False
    except requests.exceptions.Timeout:
        print("❌ Backend connection timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    print("Checking backend connection...")
    success = check_backend()
    sys.exit(0 if success else 1)


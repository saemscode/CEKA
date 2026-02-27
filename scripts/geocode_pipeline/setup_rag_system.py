#!/usr/bin/env python3
"""
Setup script for DeepSeek RAG system.
Installs dependencies and creates initial index.
"""

import subprocess
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment variables from {env_path}")
else:
    print("⚠️  .env file not found — please ensure it's in the project root")

def run_command(command, description):
    """Run a shell command and handle errors."""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        if e.stderr:
            print(f"Error output: {e.stderr}")
        return False

def check_python_version():
    """Check Python version compatibility."""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro} detected")
    return True

def install_dependencies():
    """Install required Python dependencies."""
    requirements = [
        "faiss-cpu==1.7.4",
        "numpy>=1.21.0",
        "requests>=2.25.0",
        "tenacity>=8.2.0",
        "python-dotenv>=1.0.0",
        "sentence-transformers>=2.2.2",
        "torch>=1.9.0"
    ]
    
    # Try to install from requirements file first
    requirements_file = Path("scripts/requirements_rag.txt")
    if requirements_file.exists():
        return run_command(f"pip install -r {requirements_file}", "Installing Python dependencies from requirements file")
    else:
        # Install individual packages
        for package in requirements:
            if not run_command(f"pip install {package}", f"Installing {package}"):
                return False
        return True

def create_directories():
    """Create necessary directories."""
    directories = [
        Path("scripts/data/processed"),
        Path("scripts/embeddings")
    ]
    
    for directory in directories:
        try:
            directory.mkdir(parents=True, exist_ok=True)
            print(f"✅ Created directory: {directory}")
        except Exception as e:
            print(f"❌ Failed to create directory {directory}: {e}")
            return False
    
    return True

def check_deepseek_key():
    """Check if DeepSeek API key is available."""
    if not os.getenv("DEEPSEEK_API_KEY"):
        print("⚠️  Warning: DEEPSEEK_API_KEY environment variable not set")
        print("   Please set it before running the RAG system:")
        print("   export DEEPSEEK_API_KEY=your_api_key_here")
        print("   Or add it to your .env file")
        return False
    else:
        print("✅ DEEPSEEK_API_KEY found in environment")
        return True

def create_initial_index():
    """Create initial RAG index."""
    print("📚 Creating initial RAG index...")
    try:
        from create_deepseek_rag_index import main as create_index_main
        success = create_index_main()
        if success:
            print("✅ Initial RAG index created successfully!")
            return True
        else:
            print("❌ Failed to create initial RAG index")
            return False
    except Exception as e:
        print(f"❌ Error during index creation: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 Setting up DeepSeek RAG System...")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Install dependencies
    if not install_dependencies():
        return False
    
    # Create directories
    if not create_directories():
        return False
    
    # Check DeepSeek API key
    check_deepseek_key()
    
    # Create initial index
    if not create_initial_index():
        print("⚠️  Continuing setup without index creation...")
    
    print("=" * 50)
    print("🎉 DeepSeek RAG System Setup Completed!")
    print("\n📝 Next steps:")
    print("1. Ensure DEEPSEEK_API_KEY is set in your environment")
    print("2. Run: python scripts/create_deepseek_rag_index.py (if index not created)")
    print("3. Test: python scripts/geocoding_with_rag.py")
    print("4. Integrate with your main geocoding script")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
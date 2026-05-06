#!/usr/bin/env bash
# Render build script — installs CPU-only PyTorch to save ~500MB RAM

set -o errexit

# Install CPU-only PyTorch first (much smaller than full torch)
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
pip install -r requirements.txt

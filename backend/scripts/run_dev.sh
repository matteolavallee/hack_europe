#!/bin/bash
# Script to easily run the backend for development.
uvicorn app.main:app --reload

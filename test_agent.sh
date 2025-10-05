#!/bin/bash
# Quick wrapper script for agent testing
# Usage: ./test_agent.sh "your query here" [additional args]

cd "$(dirname "$0")"
source venv/bin/activate
python agent_testing.py "$@"

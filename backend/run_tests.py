"""
Runner script for test_security_toggle.py
"""
import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

import pytest

if __name__ == "__main__":
    test_path = os.path.join(backend_dir, "tests", "test_security_toggle.py")
    ret = pytest.main([test_path, "-v", "-s"])
    sys.exit(ret)


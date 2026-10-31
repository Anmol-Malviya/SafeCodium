"""
Safe Vibe AI — Pytest Configuration & Global Fixtures.
Provides automated test-mode authentication so that existing functional and integration
tests authenticate as a default analyst user, while security & RBAC tests explicitly
test unauthenticated, analyst, and admin access paths.
"""

import pytest
from backend.app.core.auth import get_current_user
from backend.app.models.user import User


@pytest.fixture(autouse=True)
def setup_test_auth_override(request):
    """
    Overrides get_current_user dependency for general functional/integration tests,
    unless the test file explicitly tests auth/RBAC (e.g. test_auth_rbac.py).
    """
    from backend.app.main import app

    if "test_auth_rbac" in request.node.nodeid:
        # For auth/rbac tests, do not override so live auth flow is tested
        app.dependency_overrides.pop(get_current_user, None)
        yield
        app.dependency_overrides.pop(get_current_user, None)
    else:
        test_analyst = User(
            id="test-analyst-default",
            username="test_analyst",
            role="analyst",
            is_active=True,
        )
        app.dependency_overrides[get_current_user] = lambda: test_analyst
        yield
        app.dependency_overrides.pop(get_current_user, None)


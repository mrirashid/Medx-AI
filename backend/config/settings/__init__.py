from split_settings.tools import include, optional
import os

# Which environment to use
ENV = os.environ.get("DJANGO_ENV") or "dev"

# Load base + environment-specific settings
include(
    "base.py",
    optional(f"{ENV}.py"),  # loads dev.py or prod.py automatically
)

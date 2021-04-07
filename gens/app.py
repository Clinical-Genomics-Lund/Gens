"""
Whole genome visualization of BAF and log2 ratio
"""
import logging
import os
from datetime import date
from logging.config import dictConfig

import connexion
from flask import abort, render_template, request
from flask_compress import Compress
from flask_debugtoolbar import DebugToolbarExtension

from .__version__ import VERSION as version
from .blueprints import about_bp, gens_bp, login_bp
from .cache import cache
from .db import init_database
from .errors import generic_error, sample_not_found
from .graph import parse_region_str
from .io import BAF_SUFFIX, COV_SUFFIX, _get_filepath
from .utils import get_hg_type
from flask_wtf.csrf import CSRFProtect

dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
            }
        },
        "handlers": {
            "wsgi": {
                "class": "logging.StreamHandler",
                "stream": "ext://flask.logging.wsgi_errors_stream",
                "formatter": "default",
            }
        },
        "root": {"level": "INFO", "handlers": ["wsgi"]},
    }
)
LOG = logging.getLogger(__name__)
toolbar = DebugToolbarExtension()
compress = Compress()
csrf = CSRFProtect()


def create_app(config=None):
    """Create and setup Gens application."""
    application = connexion.FlaskApp(
        __name__, specification_dir="openapi/", options={"swagger_ui": True}
    )
    application.add_api("openapi.yaml")
    app = application.app
    # configure app
    app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False
    if config:
        app.config.update(config)
    app.config.from_object("gens.config")
    if os.environ.get("GENS_CONFIG") is None:
        LOG.warning("No user configuration set, set path with $GENS_CONFIG variable")
    else:
        app.config.from_envvar("GENS_CONFIG")
    # initialize database and store db content
    with app.app_context():
        init_database()
    # connect to mongo client
    app.config["DEBUG"] = True
    app.config["SECRET_KEY"] = "pass"

    # prepare app context
    initialize_extensions(app)
    # register bluprints and errors
    register_blueprints(app)
    register_errors(app)

    return app


def initialize_extensions(app):
    """Initialize flask extensions."""
    cache.init_app(app)
    compress.init_app(app)
    csrf.init_app(app)


def register_errors(app):
    """Register error pages for gens app."""
    app.register_error_handler(FileNotFoundError, sample_not_found)
    app.register_error_handler(404, generic_error)
    app.register_error_handler(416, generic_error)
    app.register_error_handler(500, generic_error)


def register_blueprints(app):
    """Register blueprints."""
    app.register_blueprint(gens_bp)
    app.register_blueprint(login_bp)
    app.register_blueprint(about_bp)

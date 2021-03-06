"""Defenition of custom error pages"""

import os
import logging

from flask import render_template

LOG = logging.getLogger(__name__)

def sample_not_found(error):
    """Resource not found."""
    sample_id = error.sample_id

    return (
        render_template(
            "sample_not_found.html",
            sample_id=sample_id,
        ),
        404,
    )


def missing_files(error):
    """Resource not found."""
    file_name = os.path.basename(str(error))

    return (
        render_template(
            "missing_files.html",
            missing_file=file_name,
        ),
        404,
    )


def generic_error(error):
    """Internal server error page."""
    return (
        render_template(
            "generic_error.html",
            error_code=error.code,
            error_desc=error.description,
        ),
        error.code,
    )

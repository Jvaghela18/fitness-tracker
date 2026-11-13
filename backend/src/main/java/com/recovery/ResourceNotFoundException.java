package com.recovery;

/** Thrown when a requested log / meal / goal does not exist. Rendered as HTTP 404. */
class ResourceNotFoundException extends RuntimeException {

  ResourceNotFoundException(String what) {
    super("Could not find " + what);
  }
}

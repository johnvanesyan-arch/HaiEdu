#!/usr/bin/env python3
"""Check historical review coverage only; never execute SQL or contact a server."""
import json
from historical_data_review import ReviewError, validate

if __name__ == '__main__':
    try:
        print(json.dumps(validate()))
    except (ReviewError, KeyError, TypeError, ValueError) as error:
        raise SystemExit(str(error) if isinstance(error, ReviewError)
                         else 'invalid_review_document') from None

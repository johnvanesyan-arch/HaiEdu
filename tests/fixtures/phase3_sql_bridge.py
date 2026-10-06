"""JSON pipe between Node tests and the disposable PostgreSQL 17 CI service."""
import json
import re
import sys
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
import psycopg
from psycopg.rows import dict_row
from phase3_postgres import database_uri


def encode(value):
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    raise TypeError(type(value).__name__)


with database_uri() as uri, psycopg.connect(uri, autocommit=True, row_factory=dict_row) as connection:
    print(json.dumps({'ready': True, 'version': connection.execute('select version() version').fetchone()['version']}), flush=True)
    for line in sys.stdin:
        request = json.loads(line)
        if request.get('close'):
            break
        try:
            params = request.get('params', [])
            bound = []
            query = request['query']
            if params:
                def placeholder(match):
                    bound.append(params[int(match[1]) - 1])
                    return '%s'
                query = re.sub(r'\$(\d+)', placeholder, query).replace('%', '%%').replace('%%s', '%s')
            cursor = connection.execute(query, bound if params else None)
            rows = cursor.fetchall() if cursor.description else []
            result = {'id': request['id'], 'rows': rows}
        except psycopg.Error as error:
            result = {'id': request['id'], 'error': str(error), 'code': error.sqlstate}
        print(json.dumps(result, default=encode), flush=True)

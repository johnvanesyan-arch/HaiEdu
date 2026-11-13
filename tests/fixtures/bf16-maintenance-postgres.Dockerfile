# syntax=docker/dockerfile:1
FROM postgres:17.6-alpine@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94
# Test-only PostgreSQL17.6 + real pg_cron1.6.7; no hosted credentials/data.
RUN --mount=type=secret,id=proxy_ca,required=true \
    SSL_CERT_FILE=/run/secrets/proxy_ca apk add --no-cache --virtual .cron-build build-base curl \
    && curl --cacert /run/secrets/proxy_ca -fsSL \
       https://codeload.github.com/citusdata/pg_cron/tar.gz/refs/tags/v1.6.7 -o /tmp/pg_cron.tar.gz \
    && echo 'd950bc29155f31017567e23a31d268ff672e98276c0e9d062512fb7870351f03  /tmp/pg_cron.tar.gz' | sha256sum -c - \
    && tar -xzf /tmp/pg_cron.tar.gz -C /tmp \
    && make -C /tmp/pg_cron-1.6.7 with_llvm=no \
    && make -C /tmp/pg_cron-1.6.7 with_llvm=no install \
    && rm -rf /tmp/pg_cron-1.6.7 /tmp/pg_cron.tar.gz \
    && apk del .cron-build
CMD ["postgres", "-c", "shared_preload_libraries=pg_cron", "-c", "cron.database_name=postgres", "-c", "cron.use_background_workers=on"]

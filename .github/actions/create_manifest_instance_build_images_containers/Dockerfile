FROM docker.io/library/python:3.13@sha256:45803c375b95ea33f482e53a461eca8f247617667d703660a06ccf5eb3d05326 AS builder

COPY images_containers_manifest.py /images_containers_manifest.py

ENTRYPOINT /images_containers_manifest.py

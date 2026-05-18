#!/usr/bin/env python3
"""Servidor de desenvolvimento — envia no-cache em TODAS as respostas.
Evita que o navegador sirva HTML/CSS/JS/imagens em versao antiga (cache).
Uso: python dev-server.py   ->   http://127.0.0.1:5500
NAO usar em producao (desativa cache de proposito)."""
import http.server
import socketserver

PORT = 5500


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', PORT), NoCacheHandler) as httpd:
    print(f'Dev server (no-cache) rodando em http://127.0.0.1:{PORT}')
    httpd.serve_forever()

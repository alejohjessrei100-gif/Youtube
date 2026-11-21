# tiny local server: serves the built page, receives each rendered frame as a PNG (POST /frame?i=N), logs, DONE flag
import http.server, sys, os
WEB, OUT, PORT = sys.argv[1], sys.argv[2], int(sys.argv[3]); os.makedirs(OUT, exist_ok=True)
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=WEB, **k)
    def log_message(s, *a): pass
    def do_POST(s):
        n = int(s.headers.get('Content-Length', 0)); body = s.rfile.read(n)
        if s.path.startswith('/frame'):
            i = int(s.path.split('i=')[1]); tmp = os.path.join(OUT, 'f_%05d.tmp' % i); open(tmp, 'wb').write(body); os.replace(tmp, os.path.join(OUT, 'f_%05d.png' % i))
        elif s.path.startswith('/log'): print('LOG', body.decode()[:400], flush=True)
        elif s.path.startswith('/done'): open(os.path.join(OUT, 'DONE'), 'w').write('1')
        s.send_response(200); s.end_headers(); s.wfile.write(b'ok')
http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()

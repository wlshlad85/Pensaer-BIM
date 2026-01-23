use std::env;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

fn handle(mut stream: TcpStream) {
    let mut buffer = [0u8; 1024];
    let size = stream.read(&mut buffer).unwrap_or(0);
    let request = String::from_utf8_lossy(&buffer[..size]);
    let ok = request.starts_with("GET /health");
    let (status, body) = if ok {
        ("200 OK", "OK")
    } else {
        ("404 Not Found", "Not Found")
    };
    let response = format!(
        "HTTP/1.1 {}\r\nContent-Length: {}\r\n\r\n{}",
        status,
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes());
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|arg| arg == "--health-check") {
        return;
    }

    let mut bind_addr = "0.0.0.0:50051".to_string();
    let mut i = 0;
    while i < args.len() {
        if args[i] == "--bind" && i + 1 < args.len() {
            bind_addr = args[i + 1].clone();
            break;
        }
        i += 1;
    }

    let listener = TcpListener::bind(&bind_addr).expect("bind failed");
    for stream in listener.incoming() {
        if let Ok(stream) = stream {
            handle(stream);
        }
    }
}

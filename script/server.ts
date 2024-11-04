import { emptyDir } from 'fs-extra';
import { createWriteStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { Server, createServer as http } from 'node:http';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { parse } from 'node:url';
import { createServer } from 'vite';

let h: Server;

const IMAGE_PATH = 'F:/science';
let index = 0;

async function startHttpServer(port: number = 4000) {
    if (h) return h;
    const server = http();

    const tryNext = () => {
        server.listen(port++, '127.0.0.1');
    };
    server.on('error', () => {
        tryNext();
    });
    server.on('listening', () => {
        console.log(`Listening: http://localhost:${port - 1}/`);
        setupHttp(server);
    });
    tryNext();

    return server;
}

function setupHttp(server: Server) {
    server.on('request', async (req, res) => {
        if (!req.url) {
            res.statusCode = 404;
            res.end();
            return;
        }

        const url = parse(req.url, true);
        const path = url.pathname;

        if (path === '/writeImage') {
            let body = '';

            // 接收传入的 Base64 数据
            req.on('data', chunk => {
                body += chunk;
            });

            req.on('end', () => {
                // 提取 Base64 字符串
                const base64Data = body.replace(/^data:image\/\w+;base64,/, '');

                // 将 Base64 数据转换为 Buffer
                const binaryData = Buffer.from(base64Data, 'base64');

                // 定义保存路径
                const filePath = join(IMAGE_PATH, `${index++}.png`);
                const stream = createWriteStream(filePath);

                // 写入文件
                stream.write(binaryData);
                stream.end();

                // 监听写入完成事件
                stream.on('finish', () => {
                    stream.end();
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Image uploaded successfully');
                });

                // 监听写入错误事件
                stream.on('error', err => {
                    stream.end();
                    console.error('File write error:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('File write error');
                });
            });
        } else {
            res.statusCode = 404;
            res.end();
        }
    });
}

function getLocalIPAddress() {
    const interfaces = networkInterfaces();
    for (const interfaceName in interfaces) {
        const addresses = interfaces[interfaceName];
        if (!addresses) return 'localhost';
        for (const address of addresses) {
            // 只获取 IPv4 地址，且不为本地回环地址
            if (
                address.family === 'IPv4' &&
                !address.internal &&
                address.address !== '26.187.45.168'
            ) {
                return address.address;
            }
        }
    }
    return 'localhost'; // 如果无法检测到局域网地址，默认回退到 localhost
}

(async function () {
    await emptyDir(IMAGE_PATH);
    const host = getLocalIPAddress();
    const vite = await createServer({
        server: {
            host
        }
    });
    await vite.listen(5000);
    console.log(`网页：http://${host}:5000/`);

    const server = await startHttpServer(4000);
    h = server;
})();

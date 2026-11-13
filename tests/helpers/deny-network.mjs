import { syncBuiltinESMExports } from "node:module";
import { Socket } from "node:net";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import tls from "node:tls";
import dgram from "node:dgram";

// Used by the examples integration test. Pipe IPC is local; every IP socket is forbidden.
const originalConnect = Socket.prototype.connect;
const attempts = [];
const deny = (name) => (...args) => {
  attempts.push(name);
  throw new Error(`Examples attempted network access: ${name} ${String(args[0])}`);
};
Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof first === "string" && !/^\d+$/.test(first)) return originalConnect.apply(this, args);
  if (first && typeof first === "object" && first.path) return originalConnect.apply(this, args);
  return deny("net.Socket.connect")(...args);
};
for (const [name, api] of [["http", http], ["https", https]]) {
  api.request = deny(`${name}.request`);
  api.get = deny(`${name}.get`);
}
for (const [name, api] of [["dns", dns], ["dns/promises", dnsPromises]]) {
  for (const method of ["lookup", "resolve", "resolve4", "resolve6"]) api[method] = deny(`${name}.${method}`);
}
tls.connect = deny("tls.connect");
dgram.Socket.prototype.send = deny("dgram.send");
syncBuiltinESMExports();
globalThis.fetch = deny("fetch");
globalThis.WebSocket = deny("WebSocket");
process.on("beforeExit", () => {
  if (attempts.length) {
    console.error(`Forbidden network attempts: ${attempts.join(", ")}`);
    process.exitCode = 91;
  }
});

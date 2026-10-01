#!/usr/bin/env node
// Runs the MCP server over stdio. stdout carries the protocol, so log to stderr only.
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { createServer } from './server.js'

serveStdio(() => createServer(), {
  onerror: (error) => console.error('tailwindshades-mcp:', error),
})

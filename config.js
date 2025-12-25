/**
 * EchoPath Extension - Environment Configuration
 * 
 * INSTRUCTIONS:
 * - For DEVELOPMENT: Set ENVIRONMENT = 'dev'
 * - For PRODUCTION: Set ENVIRONMENT = 'prod'
 * - Change this BEFORE building/packaging the extension
 */

const ENVIRONMENT = 'dev'; // Change to 'prod' for production deployment

const CONFIG = {
    local:{
        API_BASE: 'http://localhost:5000',
        FRONTEND_URL: 'http://localhost:5463',
        ENV_NAME: 'Local'
    },
    dev: {
        API_BASE: 'https://echopath-node.tensorark.com',
        FRONTEND_URL: 'https://echopath-dev.tensorark.com',
        ENV_NAME: 'Development'
    },
    prod: {
        API_BASE: 'https://echopath-api.tensorark.com',
        FRONTEND_URL: 'https://echopath.tensorark.com',
        ENV_NAME: 'Production'
    }
};

// Export the current environment configuration
const API_BASE = CONFIG[ENVIRONMENT].API_BASE;
const FRONTEND_URL = CONFIG[ENVIRONMENT].FRONTEND_URL;
const ENV_NAME = CONFIG[ENVIRONMENT].ENV_NAME;

console.log(`🌍 [EchoPath] Running in ${ENV_NAME} mode`);
console.log(`📡 API Base: ${API_BASE}`);

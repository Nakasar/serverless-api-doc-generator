const _ = require('lodash');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

module.exports = {
    generate,
};

async function generate({ folder, out, serverURL, serverName }) {
    console.log('generate doc from folder: ' + folder);

    const apiPath = folder;
    const serverlessFilePath = path.join(apiPath, './serverless.yml');
    const outPath = out;
    
    try {
        var doc = loadServerlessDefinition(serverlessFilePath);
        
        const handlers = getRoutes(doc);

        const docs = await loadDocsFromHandlers(apiPath, handlers);
        
        const routes = groupByRoute(handlers, docs);

        const yml = createDoc(routes, { serverURL, serverName });

        saveApiDocFile(yml, outPath);
    } catch (e) {
        console.log(e);
    }
}

function loadServerlessDefinition(pathToFile) {
    return yaml.safeLoad(fs.readFileSync(pathToFile, 'utf8'));
}

function getRoutes(serverless) {
    return Object.values(serverless.functions)
        .filter(func => Array.isArray(func.events))
        .map(func => {
            const handler = func.handler;

            const routes = func.events.filter(event => event.http).map(route => {
                const { method, path } = route.http;
                return { method, path };
            });

            return { routes, handler };
        });
}

async function loadDocsFromHandlers(apiPath, handlers) {
    const handlerList = _.uniq(handlers.map(handler => handler.handler));
    const fileList = _.uniq(handlerList.map(handler => [handler.split('.')[0], path.join(apiPath, handler.split('.')[0])]));

    const rawDocs = _.compact(await Promise.all(fileList.map(async ([fileName, filePath]) => {
        const file = fs.readFileSync(filePath + '.js', 'utf-8');

        const docRegex = /(\/\*\*[\s\S]*?\*\/)\n(?:module\.exports\.|async function )(.+)(?: = async |)\(.+\)(?: => | ){[\s\S]*?}/g;
        
        let handlerDoc = {};
        
        while ((res = docRegex.exec(file)) !== null) {
            const [matched, doc, name] = [...res];

            const apiDocRegex = /@apidoc \[([\s\S]*)\]/g;
            const result = apiDocRegex.exec(doc);

            if (result) {
                let [matched, parsedDoc] = [...result];

                parsedDoc = parsedDoc.replace(/ \*/g, "");
                const ymlDoc = yaml.safeLoad(parsedDoc);

                handlerDoc[name] = ymlDoc;
            }
        }

        return [fileName, handlerDoc];
    })));

    return _.fromPairs(rawDocs); 
}

function groupByRoute(handlers, docs) {
    const routes = {};

    handlers.forEach(handler => {
        handler.routes.forEach(route => {
            if (!routes['/' + route.path]) routes['/' + route.path] = {};

            const routeDoc = ((docs[handler.handler.split('.')[0]] || {})[handler.handler.split('.')[1]]) || {};
            
            routeDoc.description = routeDoc.description || "No description";
            routeDoc.summary = routeDoc.summary || routeDoc.description;
            routeDoc.operationId = routeDoc.operationId || handler.handler.split('/').pop();
            routeDoc.responses = routeDoc.responses || {};
            
            try {
                if (!routeDoc.success) {
                    throw new Error('No success definition.');
                }
                let { status = '2XX', description = 'Success', schema = { type: 'object' } } = routeDoc.success;
                routeDoc.responses[status] = {
                    description,
                    content: { 'application/json': { schema } }
                };
            } catch (err) {
                routeDoc.responses['2XX'] = routeDoc.responses['2XX'] || { '$ref': "#/components/responses/GeneralResponse" };
            }
            delete routeDoc.success;

            try {
                if (!routeDoc.failure) {
                    throw new Error('No success definition.');
                }
                for (const [status, error] of Object.entries(routeDoc.failure)) {
                    routeDoc.responses[status] = {
                        description: error.description || 'Error',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        errorMessage: {
                                            type: 'string',
                                            example: error.message || `[${status}] ${error.type || 'BasicError'}.`,
                                        },
                                        errorType: {
                                            type: 'string',
                                            example: error.type || 'BasicError',
                                        }
                                    }
                                },
                            },
                        },
                    }
                }
            } catch (err) {
                routeDoc.responses['500'] = routeDoc.responses['500'] || { '$ref': "#/components/responses/ErrorResponse" };
            }
            delete routeDoc.failure;

            try {
                if (!routeDoc.authorization) {
                    throw new Error('No authorization definition.');
                }
                routeDoc.security = {
                    [routeDoc.authorization]: []
                }
            } catch (err) {

            }
            delete routeDoc.authorization;

            routes['/' + route.path][route.method] = routeDoc;
        });
    });

    return routes;
}

function createDoc(routes, { serverURL = 'http://localhost:5000/', serverName = 'Local', title = 'Generated API', description = 'No description', termsOfService = '', contact = {}, version = '1.0.0' } = {}) {
    const doc = {
        openapi: "3.0.0",
        info: {
            title,
            description,
            termsOfService,
            contact,
            version,
        },
        servers: [
            {
                url: serverURL,
                name: serverName,
            }
        ],
        paths: routes,
        components: {
            responses: {
                GeneralResponse: {
                    description: 'General Response Object',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object'
                            },
                        },
                    },
                },
                ErrorResponse: {
                    description: 'Error Object',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    errorMessage: {
                                        type: 'string',
                                        example: "[400] a user_id or user_ids must be provided in body",
                                    },
                                    errorType: {
                                        type: 'string',
                                        example: "BadRequestError",
                                    },
                                    stackTrace: {
                                        type: 'array',
                                        items: {
                                            items: {
                                                type: 'string'
                                            },
                                        },
                                    },
                                }
                            }
                        },
                    },
                }
            },
            securitySchemes: {
                user: {
                    type: 'apiKey',
                    name: 'Authorization',
                    in: 'header',
                    description: 'User authorization from AWS Cognito services (requires additionnal headers such as signature).',
                }
            }
        }
    };

    const yml = yaml.safeDump(doc);

    return yml;
}

function saveApiDocFile(yml, outPath) {
    fs.writeFileSync(outPath, yml);
}

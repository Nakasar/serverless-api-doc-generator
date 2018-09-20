const _ = require('lodash');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

module.exports = {
    generate,
};

async function generate({ folder }) {
    console.log('generate doc from folder: ' + folder);

    const apiPath = path.join(__dirname, folder);
    const serverlessFilePath = path.join(apiPath, './serverless.yml');
    
    try {
        var doc = loadServerlessDefinition(serverlessFilePath);
        
        const handlers = getRoutes(doc);

        const docs = await loadDocsFromHandlers(apiPath, handlers);

        console.log(docs);
        
        const routes = groupByRoute(handlers);

        const yml = createDoc(routes);
        saveApiDocFile(yml);
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
    const handlerList = handlers.map(handler => handler.handler);
    const fileList = _.uniq(handlerList.map(handler => [handler, path.join(apiPath, handler.split('.')[0])]));
    
    const docRegex = /(\/\*\*[\s\S]*?\*\/)\nmodule\.exports\.(.+) = async \(.+\) => {[\s\S]*?}/g;
    const apiDocRegex = /@apidoc \[([\s\S]*)\]/g;

    const rawDocs = _.compact(await Promise.all(fileList.map(async ([handler, filePath]) => {
        const file = fs.readFileSync(filePath + '.js', 'utf-8');

        const result = docRegex.exec(file);
        if (!result) {
            return;
        }

        const [matched, ...groups] = [...result];

        if (groups.length % 2 === 1) {
            return;
        }

        const handlerDoc = {};
        while (groups.length > 0) {
            const [doc, method] = groups.splice(0, 2);

            const result = apiDocRegex.exec(doc);
            if (result) {
                let [matched, parsedDoc] = [...result];
                parsedDoc = parsedDoc.replace(/ \*/g, "");
                const ymlDoc = yaml.safeLoad(parsedDoc);

                handlerDoc[method] = ymlDoc;
            }
        }

        return [handler, handlerDoc];
    })));

    return _.fromPairs(rawDocs); 
}

function groupByRoute(handlers) {
    const routes = {};

    handlers.forEach(handler => {
        handler.routes.forEach(route => {
            if (!routes[route.path]) routes[route.path] = {};
            routes[route.path][route.method] = {
                description: 'No description',
                responses: {
                    default: {
                        '$ref': "#/components/responses/ErrorResponse",
                    },
                    "2XX": {
                        '$ref': "#/components/responses/GeneralResponse",
                    }
                }
            };
        });
    });

    return routes;
}

function createDoc(routes, { title = 'Generated API', description = 'No description', termsOfService = '', contact = {}, version = '1.0.0' } = {}) {
    const doc = {
        openapi: "3.0.0",
        info: {
            title,
            description,
            termsOfService,
            contact,
            version,
        },
        paths: routes,
        components: {
            responses: {
                GeneralResponse: {
                    description: 'General Response Object',
                    content: {
                        'application/json': {
                            type: 'object'
                        },
                    },
                },
                ErrorResponse: {
                    description: 'Error Object',
                    content: {
                        'application/json': {
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
                        },
                    },
                }
            }
        }
    };

    const yml = yaml.safeDump(doc);

    return yml;
}

function saveApiDocFile(yml) {
    fs.writeFileSync('api-doc-generated.yml', yml);
}


generate({ folder: '../api-ico' });
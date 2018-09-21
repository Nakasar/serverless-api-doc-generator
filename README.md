# INSTALLATION
- clone this repository.
- enter `npm link` in the root folder.
- You are done.

# USAGE
- anywhere, type `generate-doc -i path/to/api/folder -o path/to/out/file.yml`
path/to/api/folder must contain the serverless.yml definition.

# DOCUMENT ROUTES
```javascript
/**
 * Function description
 * @param {Object} event 
 * @param {Object} context 
 * @apidoc [
 *  description: Route description
 *  tags:
 *    - sometag
 *  parameters:
 *    - name: someParam
 *      in: path
 *      required: true
 *      description: someParam description.
 *      schema:
 *        type: integer
 * ]
 */
module.exports.get = async (event, context) => {

};
```

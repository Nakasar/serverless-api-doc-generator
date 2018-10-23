# INSTALLATION
- clone this repository.
- enter `npm link` in the root folder.
- You are done.

# USAGE
- anywhere, type `generate-doc -i path/to/api/folder -o path/to/out/file.yml`
path/to/api/folder must contain the serverless.yml definition.

## Options
- `--server-url "http://example.com/"` API base url.

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
OR :
```javascript
/** Create a new tag for an offering.
 * @param {ServerlessEvent} event
 * @param {ServerlessContext} context
 * @apidoc [
 *  description: Create a new tag for an offering.
 *  tags:
 *    - tags
 *    - offerings
 *  parameters:
 *    - name: offeringId
 *      in: path
 *      required: true
 *      description: ID of offering.
 *      schema:
 *        type: integer
 *  requestBody:
 *    description: Tag object.
 *    required: true
 *    content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *            title:
 *              type: string
 *              description: Title of tag.
 *          example:
 *            title: MY_TAG
 *          required:
 *            - title
 *  authorization: user
 *  success:
 *    status: 200
 *    description: Created tag
 *    schema:
 *      type: object
 *      properties:
 *        id:
 *          type: integer
 *          description: Unique ID of tag.
 *        title:
 *          type: string
 *          description: Unique Title of tag.
 *          example: MY_TAG
 *  failure:
 *    409:
 *      description: Tag already defined.
 *      message: This tag already exists for this offering.
 *      type: ConflictError
 *    404:
 *      description: Offering Not found.
 *      message: The offering could not be found.
 *      type: ResourceNotFoundError
 * ]
 */
async function createOneForOffering(event, context) {

};
```  
Other naming convention of function WILL NOT be computed.

The generator will automatically add a default and a '2XX' generic response if they are not defined in the @apidoc description.